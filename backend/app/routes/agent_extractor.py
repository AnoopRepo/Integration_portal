import os
import re
import sys
import time
import requests
import datetime
import psutil
import multiprocessing
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(tags=["Agent Extractors"])

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")

class FileMetadata(BaseModel):
    name: str
    size: int

class ExtractionRequest(BaseModel):
    resume_text: str
    files_metadata: Optional[List[FileMetadata]] = []

def get_ollama_model() -> str:
    try:
        res = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if res.status_code == 200:
            models_list = res.json().get("models", [])
            model_names = [m["name"] for m in models_list]
            for name in model_names:
                if "qwen" in name.lower():
                    return name
            if model_names:
                return model_names[0]
    except Exception as e:
        print(f"[Ollama Tags Warning]: {e}")
    return "qwen3:4b"

def log_system_resources(stage: str):
    """Logs system RAM and CPU usage details."""
    try:
        vm = psutil.virtual_memory()
        process = psutil.Process(os.getpid())
        process_mem = process.memory_info().rss / (1024 * 1024)  # RSS in MB
        print(f"--- RESOURCE USAGE ({stage}) ---")
        print(f"System RAM: {vm.percent}% used (Available: {vm.available / (1024**3):.2f} GB / Total: {vm.total / (1024**3):.2f} GB)")
        print(f"System CPU: {psutil.cpu_percent()}% used")
        print(f"FastAPI Process RAM Usage: {process_mem:.2f} MB")
        print("--------------------------------")
    except Exception as e:
        print(f"[Resource Log Warning]: {e}")

def run_extraction_diagnostics(resume_text: str, files_metadata: List[FileMetadata], model_name: str) -> dict:
    """Core LLM call handler with detailed logging, timing, and token estimation."""
    print("\n" + "="*80)
    print("[OLLAMA] STARTING RESUME EXTRACTION DIAGNOSTICS")
    print("="*80)

    num_files = len(files_metadata)
    print(f"Number of uploaded files: {num_files}")
    for idx, file_meta in enumerate(files_metadata):
        print(f"  File {idx + 1}: Name='{file_meta.name}', Size={file_meta.size} bytes")

    extracted_len = len(resume_text)
    print(f"Extracted Text Length: {extracted_len} characters")
    
    if extracted_len == 0:
        print("WARNING: Extracted text is empty!")
    elif extracted_len < 50:
        print(f"WARNING: Extracted text is extremely short ({extracted_len} chars). Might be corrupted, empty, or scanned image requiring OCR.")
    
    page_markers = re.findall(r"page\s+\d+|--- START RESUME ---", resume_text, re.IGNORECASE)
    print(f"Structure check: found {len(page_markers)} resume/page section boundaries in text.")

    print("\n--- FIRST 1000 CHARACTERS OF EXTRACTED TEXT ---")
    print(resume_text[:1000])
    print("------------------------------------------------")

    MAX_RESUME_CHARS = 18000  # ~4500 tokens — safe budget for resume content
    if len(resume_text) > MAX_RESUME_CHARS:
        print(f"WARNING: Resume text truncated from {len(resume_text)} chars to {MAX_RESUME_CHARS} chars to prevent context overflow and RAM exhaustion.")
        resume_text = resume_text[:MAX_RESUME_CHARS] + "\n\n[...text truncated to fit model context window...]\n"

    system_prompt = (
        "You are a structured data extractor. Output ONLY a markdown table. No explanations."
    )
    
    TABLE_HEADER = (
        "| Name | Email | Key Skills |\n"
        "| ---- | ----- | ---------- |"
    )
    
    user_prompt = (
        "Extract Name, Email, and Key Skills from each resume below.\n"
        "Rules:\n"
        "- Name: full name at top. If missing: NOT_FOUND\n"
        "- Email: primary email. If missing: NOT_FOUND\n"
        "- Key Skills: up to 10 technical skills, comma-separated (Python, SQL, React, Docker, AWS, etc). No soft skills.\n"
        "- One row per resume. Never merge resumes.\n"
        "- Use NOT_FOUND for any missing field.\n\n"
        f"RESUME DATA:\n\n{resume_text}"
    )

    prompt_len = len(system_prompt) + len(user_prompt)
    est_prompt_tokens = prompt_len // 4
    payload_bytes = sys.getsizeof(system_prompt) + sys.getsizeof(user_prompt)

    print("\nDEBUG:")
    print(f"System Prompt Length: {len(system_prompt)} chars")
    print(f"User Prompt Length: {len(user_prompt)} chars")
    print(f"Total Prompt Length: {prompt_len} chars")
    print(f"Estimated Prompt Tokens (chars/4): {est_prompt_tokens} tokens")
    print(f"Request Payload Size: {payload_bytes} bytes")
    print(f"Model: {model_name}")
    
    if est_prompt_tokens > 2048:
        print(f"WARNING: Estimated tokens ({est_prompt_tokens}) exceed typical 2048 local model context window limit!")
        print("This can trigger extreme CPU/memory swapping and context compression, leading to timeouts.")

    log_system_resources("BEFORE OLLAMA CALL")

    start_time_str = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"Request Started: {start_time_str}")
    start_time = time.time()

    try:
        url = f"{OLLAMA_URL}/api/chat"
        print(f"Sending POST to {url} (Stream: False)...")
        
        cpu_count = multiprocessing.cpu_count()
        print(f"Using {cpu_count} CPU threads for Ollama generation.")

        res = requests.post(
            url,
            json={
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": TABLE_HEADER},
                ],
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0.0,
                    "num_predict": 800,
                    "num_ctx": 4096,
                    "num_thread": cpu_count,
                }
            },
            timeout=600
        )
        end_time = time.time()
        end_time_str = datetime.datetime.now().strftime("%H:%M:%S")
        duration = end_time - start_time
        
        print(f"Request Ended: {end_time_str}")
        print(f"Total Response Duration: {duration:.2f} seconds")
        
        log_system_resources("AFTER OLLAMA CALL")

        if res.status_code != 200:
            print(f"Ollama returned HTTP error status: {res.status_code}")
            raise HTTPException(
                status_code=502,
                detail=f"Ollama returned status {res.status_code}: {res.text}"
            )

        response_json = res.json()
        raw_output = response_json.get("message", {}).get("content", "").strip()
        print(f"Extracted response length: {len(raw_output)} characters")
        print(f"RAW OUTPUT PREVIEW:\n{raw_output[:500]}")

        raw_output = re.sub(r"<(think|thought)>[\s\S]*?</\1>", "", raw_output, flags=re.IGNORECASE | re.DOTALL)
        raw_output = re.sub(r"<(think|thought)>[\s\S]*", "", raw_output, flags=re.IGNORECASE | re.DOTALL)
        raw_output = raw_output.strip()

        if raw_output.startswith("```"):
            lines_tmp = raw_output.split("\n")
            if lines_tmp[0].startswith("```"):
                lines_tmp = lines_tmp[1:]
            if lines_tmp and lines_tmp[-1].startswith("```"):
                lines_tmp = lines_tmp[:-1]
            raw_output = "\n".join(lines_tmp).strip()

        full_table = TABLE_HEADER + "\n" + raw_output

        table_lines = [
            l for l in full_table.split("\n")
            if l.strip().startswith("|") and l.strip().endswith("|")
        ]

        if table_lines:
            seen_header = False
            seen_sep = False
            deduped = []
            for l in table_lines:
                is_sep = re.match(r"^\|[\s\-:|]+\|$", l.replace(" ", ""))
                is_header = "Name" in l and "Email" in l
                if is_header:
                    if not seen_header:
                        deduped.append(l)
                        seen_header = True
                elif is_sep:
                    if not seen_sep:
                        deduped.append(l)
                        seen_sep = True
                else:
                    deduped.append(l)
            raw_output = "\n".join(deduped)
            print(f"Final clean table ({len(deduped)} lines):\n{raw_output}")
        else:
            print("WARNING: No table lines found in model output. Returning raw output.")

        return {
            "result": raw_output,
            "duration": duration,
            "prompt_length": prompt_len,
            "estimated_tokens": est_prompt_tokens,
            "model_used": model_name
        }

    except requests.exceptions.Timeout as t_err:
        end_time = time.time()
        duration = end_time - start_time
        print(f"CRITICAL: Ollama request TIMED OUT after {duration:.2f} seconds!")
        log_system_resources("ON TIMEOUT")
        raise HTTPException(
            status_code=504,
            detail=(
                f"Ollama timed out after {duration:.0f}s. "
                "Tips: (1) Use a smaller PDF or fewer files. "
                "(2) Run 'ollama ps' to check if the model is loaded. "
                "(3) Restart Ollama with: 'ollama serve'. "
                f"Technical: {str(t_err)}"
            )
        )
    except requests.exceptions.RequestException as e:
        end_time = time.time()
        duration = end_time - start_time
        print(f"CRITICAL: Failed to connect to Ollama after {duration:.2f} seconds. Error: {e}")
        log_system_resources("ON FAILURE")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to communicate with local Ollama instance. Make sure Ollama is running ('ollama serve'). Error: {str(e)}"
        )

@router.post("/extract-email")
def extract_email(req: ExtractionRequest, request: Request):
    print(f"\n[Incoming Request] POST /extract-email from {request.client.host}")
    model = get_ollama_model()
    diag = run_extraction_diagnostics(req.resume_text, req.files_metadata, model)
    return {"result": diag["result"]}

@router.get("/debug-ollama")
def debug_ollama():
    """Diagnostic endpoint to verify simple connection and prompt timing to local Ollama."""
    print("\n--- GET /debug-ollama Diagnostic Called ---")
    model = get_ollama_model()
    prompt = "hello"
    start_time = time.time()
    
    try:
        url = f"{OLLAMA_URL}/api/generate"
        print(f"Sending test request to {url} with model {model}...")
        
        cpu_count = multiprocessing.cpu_count()
        res = requests.post(
            url,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.0,
                    "num_predict": 50,
                }
            },
            timeout=10
        )
        end_time = time.time()
        duration = end_time - start_time
        
        if res.status_code == 200:
            ans = res.json().get("response", "").strip()
            ans = re.sub(r"<(think|thought)>[\s\S]*?</\1>", "", ans, flags=re.IGNORECASE | re.DOTALL)
            ans = re.sub(r"<(think|thought)>[\s\S]*", "", ans, flags=re.IGNORECASE | re.DOTALL).strip()
            print(f"Ollama responded successfully in {duration:.2f} seconds: '{ans}'")
            return {
                "status": "connected",
                "model": model,
                "response": ans,
                "generation_time_sec": duration,
                "error": None
            }
        else:
            print(f"Ollama returned error status: {res.status_code}")
            return {
                "status": "error",
                "model": model,
                "response": None,
                "generation_time_sec": duration,
                "error": f"Ollama HTTP Error {res.status_code}: {res.text}"
            }
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        print(f"Ollama diagnostic failed after {duration:.2f} seconds: {e}")
        return {
            "status": "failed",
            "model": model,
            "response": None,
            "generation_time_sec": duration,
            "error": str(e)
        }

@router.post("/debug-resume")
def debug_resume(req: ExtractionRequest):
    print("\n--- POST /debug-resume Diagnostic Called ---")
    model = get_ollama_model()
    diag = run_extraction_diagnostics(req.resume_text, req.files_metadata, model)
    return diag

@router.get("/health-agent")
def health_agent_check():
    """Quick health check — also verifies Ollama connectivity."""
    try:
        res = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        ollama_ok = res.status_code == 200
        model = get_ollama_model() if ollama_ok else None
    except Exception:
        ollama_ok = False
        model = None
    return {
        "status": "ok",
        "ollama_reachable": ollama_ok,
        "ollama_url": OLLAMA_URL,
        "model": model,
    }


# ==============================================================================
# BILL EXTRACTOR
# ==============================================================================

class BillItem(BaseModel):
    filename: str
    text: str

class BillExtractRequest(BaseModel):
    bills: List[BillItem]

BILL_EXTRACTION_PROMPT = """You are an expert Bill Information Extraction Engine.

Extract the following fields:

1. Name
2. Bill Number
3. Date
4. Purpose of Bill

RULES:

NAME:
* Extract customer name.
* Convert the name to UPPERCASE (all capital letters), e.g. "SARAH JENKINS".
* If unavailable return NOT_FOUND.

BILL NUMBER:
* Extract invoice number, bill number, receipt number, reference number, invoice ID, or similar.
* If unavailable return NOT_FOUND.

DATE:
* Extract the bill date.
* Reformat or parse the date to follow the format: DD-MM-YYYY (e.g., 12-03-2026, 18-05-2026). Always output DD-MM-YYYY.
* If unavailable return NOT_FOUND.

PURPOSE OF BILL:
* Determine what the bill is for.
* Examples:
  Electricity Bill
  Water Bill
  Internet Bill
  Mobile Recharge
  Grocery Purchase
  Restaurant Bill
  Fuel Purchase
  Hotel Invoice
  Medical Bill
  Tuition Fee
  Shopping Purchase
* Use a short descriptive value.
* If unclear return NOT_FOUND.

IMPORTANT:
Return ONLY JSON.

Output format:
{
  "name": "JOHN DOE",
  "bill_number": "INV-12345",
  "date": "12-03-2026",
  "purpose_of_bill": "Internet Bill"
}

Do not return explanations.
Do not return markdown.
Do not return code blocks.

Bill text:
"""

MAX_BILL_CHARS = 12000

def normalize_bill_date(date_str: str) -> str:
    if not date_str or date_str == "NOT_FOUND":
        return "NOT_FOUND"
    date_str = date_str.strip()
    
    date_str = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_str, flags=re.IGNORECASE)
    
    formats = [
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y",
        "%B %d %Y", "%b %d %Y",
        "%d-%m-%y", "%d/%m/%y", "%y-%m-%d", "%y/%m/%d",
    ]
    
    cleaned_str = re.sub(r'\s+', ' ', date_str)
    
    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(cleaned_str, fmt)
            return dt.strftime("%d-%m-%Y")
        except ValueError:
            continue
            
    match = re.search(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', cleaned_str)
    if match:
        yyyy, mm, dd = match.groups()
        return f"{int(dd):02d}-{int(mm):02d}-{yyyy}"
        
    match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', cleaned_str)
    if match:
        dd, mm, yyyy = match.groups()
        return f"{int(dd):02d}-{int(mm):02d}-{yyyy}"
        
    return date_str

def extract_single_bill(bill_text: str, filename: str, model_name: str) -> dict:
    if len(bill_text) > MAX_BILL_CHARS:
        print(f"[Bill] Truncating '{filename}' from {len(bill_text)} → {MAX_BILL_CHARS} chars")
        bill_text = bill_text[:MAX_BILL_CHARS] + "\n[...truncated...]"

    if bill_text in ("[EMPTY_PDF]", "[PARSE_ERROR]"):
        print(f"[Bill] Skipping Ollama call for '{filename}' — frontend reported parse failure.")
        return {
            "name": "NOT_FOUND",
            "bill_number": "NOT_FOUND",
            "date": "NOT_FOUND",
            "purpose_of_bill": "NOT_FOUND",
            "filename": filename,
            "error": f"PDF could not be read ({bill_text})",
        }

    cpu_count = multiprocessing.cpu_count()
    system_prompt = "You are a precise JSON data extractor. Output ONLY raw JSON. Do NOT wrap in markdown code blocks. Do NOT include explanations."
    user_prompt = BILL_EXTRACTION_PROMPT + bill_text
    print(f"\n[Bill] Sending '{filename}' to Ollama ({len(user_prompt)} chars)…")

    start = time.time()
    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": "{\n"},
                ],
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0.0,
                    "num_predict": 256,
                    "num_ctx": 4096,
                    "num_thread": cpu_count,
                },
            },
            timeout=600,
        )
        duration = time.time() - start
        print(f"[Bill] '{filename}' Ollama responded in {duration:.1f}s")

        if res.status_code != 200:
            raise ValueError(f"Ollama HTTP {res.status_code}: {res.text}")

        raw = "{\n" + res.json().get("message", {}).get("content", "").strip()
        raw = re.sub(r"<(think|thought)>[\s\S]*?</\1>", "", raw, flags=re.IGNORECASE | re.DOTALL)
        raw = re.sub(r"<(think|thought)>[\s\S]*", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()

        if raw.startswith("```"):
            lines = raw.split("\n")
            lines = lines[1:] if lines[0].startswith("```") else lines
            lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
            raw = "\n".join(lines).strip()

        json_match = re.search(r"\{[\s\S]*?\}", raw)
        if not json_match:
            raise ValueError(f"No JSON object found in model output: {raw[:200]}")

        import json as _json
        parsed = _json.loads(json_match.group())

        name_val = str(parsed.get("name", "NOT_FOUND")).strip() or "NOT_FOUND"
        if name_val != "NOT_FOUND":
            name_val = name_val.upper()

        date_val = str(parsed.get("date", "NOT_FOUND")).strip() or "NOT_FOUND"
        date_val = normalize_bill_date(date_val)

        return {
            "name":            name_val,
            "bill_number":     str(parsed.get("bill_number", "NOT_FOUND")).strip() or "NOT_FOUND",
            "date":            date_val,
            "purpose_of_bill": str(parsed.get("purpose_of_bill", "NOT_FOUND")).strip() or "NOT_FOUND",
            "filename":        filename,
        }

    except requests.exceptions.Timeout:
        duration = time.time() - start
        print(f"[Bill] TIMEOUT for '{filename}' after {duration:.0f}s")
        return {
            "name": "NOT_FOUND", "bill_number": "NOT_FOUND",
            "date": "NOT_FOUND", "purpose_of_bill": "NOT_FOUND",
            "filename": filename,
            "error": f"Ollama timed out after {duration:.0f}s",
        }
    except Exception as exc:
        duration = time.time() - start
        print(f"[Bill] ERROR for '{filename}' after {duration:.1f}s: {exc}")
        return {
            "name": "NOT_FOUND", "bill_number": "NOT_FOUND",
            "date": "NOT_FOUND", "purpose_of_bill": "NOT_FOUND",
            "filename": filename,
            "error": str(exc),
        }

@router.post("/extract-bills")
def extract_bills(req: BillExtractRequest, request: Request):
    print(f"\n[Incoming Request] POST /extract-bills from {request.client.host}")
    print(f"  Number of bills: {len(req.bills)}")

    model = get_ollama_model()
    print(f"  Using model: {model}")

    results = []
    for idx, bill in enumerate(req.bills):
        print(f"\n  Processing bill {idx + 1}/{len(req.bills)}: '{bill.filename}'")
        record = extract_single_bill(bill.text, bill.filename, model)
        results.append(record)

    print(f"\n[extract-bills] Completed. Returning {len(results)} bill record(s).")
    return {"bills": results}
