import type { Conversation } from '../types';

export const mockAIResponses: string[] = [
  `Sure! Here's a brief explanation:\n\n**Neural networks** are computational systems inspired by the human brain. They consist of:\n\n- **Input layer** — receives raw data\n- **Hidden layers** — process and transform information\n- **Output layer** — produces the final result\n\nEach connection has a *weight* that gets adjusted during training via backpropagation. Over time, the network learns to recognize patterns.\n\n\`\`\`python\nimport torch\nimport torch.nn as nn\n\nclass SimpleNN(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.layers = nn.Sequential(\n            nn.Linear(784, 128),\n            nn.ReLU(),\n            nn.Linear(128, 10)\n        )\n\n    def forward(self, x):\n        return self.layers(x)\n\`\`\`\n\nThis pattern powers everything from image recognition to language models like me!`,

  `Great question! Here's a Python script that accomplishes that:\n\n\`\`\`python\nimport os\nimport json\nfrom pathlib import Path\n\ndef process_files(directory: str) -> dict:\n    """Process all files in the given directory."""\n    results = {}\n    path = Path(directory)\n    \n    for file in path.glob("**/*"):\n        if file.is_file():\n            results[str(file)] = {\n                "size": file.stat().st_size,\n                "extension": file.suffix,\n                "modified": file.stat().st_mtime\n            }\n    \n    return results\n\nif __name__ == "__main__":\n    data = process_files(".")\n    print(json.dumps(data, indent=2))\n\`\`\`\n\nThis script recursively scans the directory, collecting file metadata. You can extend it to filter by extension or process content.`,

  `I've analyzed the document and here's a summary:\n\n## Key Findings\n\n1. **Market Opportunity** — The total addressable market is projected at **$47B** by 2027\n2. **Competitive Advantage** — Proprietary dataset with 3x more training examples than nearest competitor\n3. **Revenue Model** — SaaS subscription with enterprise tier starting at $2,000/month\n\n## Recommendations\n\n- Focus on enterprise sales cycle (6-9 months)\n- Prioritize SOC 2 Type II certification\n- Expand API documentation for developer adoption\n\n> The document indicates strong product-market fit with **94% customer retention** after year one.`,

  `Absolutely! Here's a comprehensive report:\n\n# Q2 2025 Performance Report\n\n| Metric | Q1 2025 | Q2 2025 | Change |\n|--------|---------|---------|--------|\n| Revenue | $2.4M | $3.1M | +29.2% |\n| Users | 12,400 | 18,700 | +50.8% |\n| Churn | 3.2% | 2.1% | -1.1pp |\n| NPS | 42 | 67 | +25 |\n\n## Highlights\n\n✅ Exceeded revenue targets by 18%\n✅ Launched enterprise tier with 12 paying customers\n⚠️ Infrastructure costs grew 45% — optimization needed\n\nOverall trajectory is **strongly positive**. The team should focus on infrastructure cost reduction in Q3.`,

  `Here's how you can implement that React component:\n\n\`\`\`tsx\nimport { useState, useEffect } from 'react';\n\ninterface DataTableProps<T> {\n  data: T[];\n  columns: Column<T>[];\n  pageSize?: number;\n}\n\nexport function DataTable<T extends { id: string }>({ \n  data, \n  columns, \n  pageSize = 10 \n}: DataTableProps<T>) {\n  const [page, setPage] = useState(0);\n  const [sorted, setSorted] = useState(data);\n  \n  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);\n  \n  return (\n    <div className="rounded-xl border border-white/10 overflow-hidden">\n      <table className="w-full">\n        <thead>\n          <tr className="border-b border-white/10">\n            {columns.map(col => (\n              <th key={col.key} className="px-4 py-3 text-left">\n                {col.header}\n              </th>\n            ))}\n          </tr>\n        </thead>\n        <tbody>\n          {paginated.map(row => (\n            <tr key={row.id}>{/* cells */}</tr>\n          ))}\n        </tbody>\n      </table>\n    </div>\n  );\n}\n\`\`\`\n\nThis gives you a type-safe, paginated table. Let me know if you'd like sorting or filtering added!`,
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Explain neural networks',
    timestamp: '2h ago',
    pinned: true,
    agentId: 'qwen',
    messages: [
      {
        id: 'msg-1-1',
        role: 'user',
        content: 'Can you explain how neural networks work in simple terms?',
        timestamp: '2:34 PM',
      },
      {
        id: 'msg-1-2',
        role: 'assistant',
        content: mockAIResponses[0],
        timestamp: '2:34 PM',
        tokens: 312,
      },
      {
        id: 'msg-1-3',
        role: 'user',
        content: 'What is backpropagation exactly?',
        timestamp: '2:36 PM',
      },
      {
        id: 'msg-1-4',
        role: 'assistant',
        content: `**Backpropagation** is the algorithm used to train neural networks. Here's the step-by-step process:\n\n1. **Forward pass** — Input data flows through the network to produce a prediction\n2. **Calculate loss** — Compare prediction to the true label using a loss function (e.g. cross-entropy)\n3. **Backward pass** — Compute gradients of the loss with respect to each weight using the chain rule\n4. **Update weights** — Subtract gradients × learning rate from each weight\n\nThis cycle repeats until the model converges. The key insight is the **chain rule** from calculus, which allows gradients to flow backward through arbitrary depth networks efficiently.`,
        timestamp: '2:37 PM',
        tokens: 198,
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Python file processor script',
    timestamp: '5h ago',
    pinned: false,
    agentId: 'qwen',
    messages: [
      {
        id: 'msg-2-1',
        role: 'user',
        content: 'Write a Python script to recursively process files in a directory',
        timestamp: '10:12 AM',
      },
      {
        id: 'msg-2-2',
        role: 'assistant',
        content: mockAIResponses[1],
        timestamp: '10:12 AM',
        tokens: 287,
      },
      {
        id: 'msg-2-3',
        role: 'user',
        content: 'Can you add filtering by file extension?',
        timestamp: '10:15 AM',
      },
      {
        id: 'msg-2-4',
        role: 'assistant',
        content: `Absolutely! Here's the updated version with extension filtering:\n\n\`\`\`python\ndef process_files(directory: str, extensions: list[str] | None = None) -> dict:\n    """Process files, optionally filtering by extension."""\n    results = {}\n    path = Path(directory)\n    \n    for file in path.glob("**/*"):\n        if not file.is_file():\n            continue\n        if extensions and file.suffix.lower() not in extensions:\n            continue\n        results[str(file)] = {\n            "size": file.stat().st_size,\n            "extension": file.suffix,\n        }\n    \n    return results\n\n# Usage:\npy_files = process_files(".", extensions=[".py", ".ts"])\n\`\`\`\n\nPass a list of extensions like \`[".py", ".js"]\` to filter, or leave it \`None\` to process all files.`,
        timestamp: '10:16 AM',
        tokens: 201,
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Q2 Performance Report',
    timestamp: 'Yesterday',
    pinned: false,
    agentId: 'qwen',
    messages: [
      {
        id: 'msg-3-1',
        role: 'user',
        content: 'Generate a Q2 performance report based on our metrics',
        timestamp: 'Yesterday 3:20 PM',
      },
      {
        id: 'msg-3-2',
        role: 'assistant',
        content: mockAIResponses[3],
        timestamp: 'Yesterday 3:21 PM',
        tokens: 421,
      },
    ],
  },
  {
    id: 'conv-4',
    title: 'React DataTable component',
    timestamp: '2 days ago',
    pinned: false,
    agentId: 'qwen',
    messages: [
      {
        id: 'msg-4-1',
        role: 'user',
        content: 'Help me build a reusable DataTable component in React with TypeScript',
        timestamp: '2 days ago 11:05 AM',
      },
      {
        id: 'msg-4-2',
        role: 'assistant',
        content: mockAIResponses[4],
        timestamp: '2 days ago 11:06 AM',
        tokens: 389,
      },
      {
        id: 'msg-4-3',
        role: 'user',
        content: 'Add sorting functionality to it',
        timestamp: '2 days ago 11:10 AM',
      },
      {
        id: 'msg-4-4',
        role: 'assistant',
        content: `To add sorting, we'll track the sort state and apply it:\n\n\`\`\`tsx\ntype SortDirection = 'asc' | 'desc' | null;\n\ninterface SortState {\n  key: string;\n  direction: SortDirection;\n}\n\n// Inside your component:\nconst [sortState, setSortState] = useState<SortState>({ key: '', direction: null });\n\nconst sorted = useMemo(() => {\n  if (!sortState.direction) return data;\n  return [...data].sort((a, b) => {\n    const aVal = a[sortState.key as keyof T];\n    const bVal = b[sortState.key as keyof T];\n    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;\n    return sortState.direction === 'asc' ? cmp : -cmp;\n  });\n}, [data, sortState]);\n\`\`\`\n\nClick the column header to cycle: **none → ascending → descending**.`,
        timestamp: '2 days ago 11:11 AM',
        tokens: 267,
      },
    ],
  },
  {
    id: 'conv-5',
    title: 'Document summarization',
    timestamp: '3 days ago',
    pinned: false,
    agentId: 'qwen',
    messages: [
      {
        id: 'msg-5-1',
        role: 'user',
        content: 'Please summarize this research document about LLMs',
        timestamp: '3 days ago 9:00 AM',
      },
      {
        id: 'msg-5-2',
        role: 'assistant',
        content: mockAIResponses[2],
        timestamp: '3 days ago 9:01 AM',
        tokens: 302,
      },
    ],
  },
];
