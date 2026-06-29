import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { CreditCard, Clock, FileText, Download, Trash2, Calendar, FileDown, ShieldAlert, Sparkles } from 'lucide-react';

const UserExpenses = () => {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Submit Expense Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Travel');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchUserExpenseData = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch both in parallel
      const [expenseRes, docRes] = await Promise.all([
        fetch(`${API_URL}/api/expenses`, { headers }),
        fetch(`${API_URL}/api/documents`, { headers }),
      ]);

      if (!expenseRes.ok) throw new Error('Failed to load expense records');
      setExpenses(await expenseRes.json());
      if (docRes.ok) setDocuments(await docRes.json());

    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to sync records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUserExpenseData();
  }, [token]);

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    const chosenDoc = documents.find(d => d.id === selectedDocId);
    const expensePayload = {
      amount: parseFloat(amount),
      category,
      description,
      date,
      document_id: selectedDocId || null,
      document_title: chosenDoc ? chosenDoc.title : null,
      document_url: chosenDoc ? chosenDoc.file_url : null
    };

    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(expensePayload)
      });

      if (res.ok) {
        setAmount('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedDocId('');
        fetchUserExpenseData();
        alert('✅ Expense claim submitted successfully for admin audit!');
      } else {
        alert('❌ Failed to submit expense claim.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeletePendingExpense = async (id) => {
    if (!window.confirm('Withdraw this pending expense claim?')) return;
    try {
      const res = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchUserExpenseData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Aggregates
  const totalClaimed = expenses.reduce((acc, e) => acc + (e.status === 'Approved' ? e.amount : 0), 0);
  const totalPending = expenses.reduce((acc, e) => acc + (e.status === 'Pending' ? e.amount : 0), 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-10 relative overflow-hidden text-text-primary animate-fadeIn">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-brand-primary/5 rounded-full filter blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-brand-accent/5 rounded-full filter blur-[80px] pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto z-10 space-y-10">
        
        {/* Header */}
        <div className="border-b border-border-primary pb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1 font-mono">Self-Service Console</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary">
            Expenses &amp; Policies
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Submit expense claims for reimbursement and read corporate policy resources published by your administration.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-bg-surface border border-border-primary rounded-2xl shadow-sm">
            <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary text-sm font-mono">Synchronizing your dashboard...</p>
          </div>
        ) : error ? (
          <div className="bg-brand-error/10 border border-brand-error/20 rounded-2xl p-8 text-center text-brand-error shadow-sm">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchUserExpenseData} className="mt-4 px-4 py-2 bg-brand-error/25 border border-brand-error/35 rounded-xl text-sm font-medium hover:bg-brand-error/20 transition-all cursor-pointer">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Submit expense form */}
            <div className="lg:col-span-1 space-y-6">
              <form 
                onSubmit={handleSubmitExpense}
                className="bg-bg-surface border border-border-primary rounded-3xl p-6 md:p-8 space-y-5 shadow-sm"
              >
                <h3 className="text-lg font-extrabold tracking-tight text-text-primary border-b border-border-primary pb-3">Submit Expense Claim</h3>
                
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Claim Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary outline-none focus:border-brand-primary transition shadow-sm placeholder:text-text-muted"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-sm text-text-primary focus:border-brand-primary transition cursor-pointer"
                  >
                    <option value="Travel">✈ Travel &amp; Fuel</option>
                    <option value="Meals">🍽 Meals &amp; Catering</option>
                    <option value="Hardware">💻 Hardware &amp; Accessories</option>
                    <option value="Software">🔧 Software &amp; Licenses</option>
                    <option value="Utilities">💡 Office Utilities &amp; Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Date of Expense</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary outline-none focus:border-brand-primary transition"
                  />
                </div>

                 <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Supporting Document / Receipt</label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-surface-alt border border-border-primary rounded-xl text-xs text-text-primary focus:border-brand-primary transition cursor-pointer"
                  >
                    <option value="">-- No Supporting Document --</option>
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>{d.title} ({d.category})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 font-mono">Reason / Description</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide itemized detail of purchases..."
                    rows="3"
                    className="w-full px-4 py-3 bg-bg-surface-alt border border-border-primary rounded-xl text-text-primary outline-none focus:border-brand-primary transition text-xs resize-none placeholder:text-text-muted"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all uppercase tracking-wider text-xs cursor-pointer"
                >
                  {submitLoading ? 'Transmitting claim...' : 'Submit Claim'}
                </button>
              </form>

              {/* Policy Quick Docs */}
              <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-primary font-mono flex items-center gap-1.5"><FileText size={16} /> Library &amp; Policies</h3>
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <p className="text-text-muted text-xs py-4 font-mono">No published resources listed in directory.</p>
                  ) : (
                    documents.map(d => (
                      <div key={d.id} className="p-3 bg-bg-surface-alt border border-border-primary rounded-xl flex justify-between items-center gap-4 hover:border-border-hover transition-all shadow-sm">
                        <div className="min-w-0">
                          <span className="px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary text-[8px] font-black uppercase rounded border border-brand-primary/15 font-mono">{d.category}</span>
                          <p className="font-bold text-xs text-text-primary mt-1.5 leading-snug truncate">{d.title}</p>
                        </div>
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 bg-bg-surface border border-border-primary rounded text-[9px] uppercase tracking-wide font-black text-text-secondary hover:text-brand-primary shadow-sm hover:bg-bg-surface-alt transition-colors shrink-0 flex items-center gap-1"><Download size={10} /> Open</a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Expense ledger */}
            <div className="lg:col-span-2 space-y-6">
              {/* Aggregates Dashboard */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <div>
                    <span className="text-text-muted text-[9px] font-black uppercase tracking-widest font-mono">Reimbursed Cash</span>
                    <h3 className="text-2xl font-extrabold mt-1 text-brand-success">${totalClaimed.toFixed(2)}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-brand-success text-xl">💰</div>
                </div>
                <div className="bg-bg-surface border border-border-primary rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <div>
                    <span className="text-text-muted text-[9px] font-black uppercase tracking-widest font-mono">Pending Review</span>
                    <h3 className="text-2xl font-extrabold mt-1 text-brand-warning">${totalPending.toFixed(2)}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand-warning/10 border border-brand-warning/20 flex items-center justify-center text-brand-warning text-xl">⏱️</div>
                </div>
              </div>

              {/* Claims Timeline Table */}
              <div className="bg-bg-surface border border-border-primary rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-lg font-bold text-text-primary">Claim Status Registry</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-primary">
                        <th className="py-2.5 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Category</th>
                        <th className="py-2.5 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Description</th>
                        <th className="py-2.5 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Amount</th>
                        <th className="py-2.5 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Status</th>
                        <th className="py-2.5 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">Remarks</th>
                        <th className="py-2.5 pb-3 px-3 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/50">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-10 text-text-muted text-xs font-mono">No expense claims logged.</td>
                        </tr>
                      ) : (
                        expenses.map((e) => (
                          <tr key={e.id} className="hover:bg-bg-surface-alt/45 transition-colors">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-xs text-text-primary block">{e.category}</span>
                              <span className="text-[9px] font-mono text-text-muted">{e.date}</span>
                            </td>
                            <td className="py-3.5 px-3 text-xs text-text-secondary max-w-xs truncate">
                              {e.description}
                              {e.document_url && (
                                <a 
                                  href={e.document_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-0.5 ml-2 text-[10px] text-brand-primary hover:text-brand-primary/80 font-bold hover:underline font-mono"
                                >
                                  📂 Receipt
                                </a>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-xs font-bold text-brand-primary">${e.amount.toFixed(2)}</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                e.status === 'Approved' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' :
                                e.status === 'Rejected' ? 'bg-brand-error/10 text-brand-error border-brand-error/20' :
                                'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                              }`}>
                                {e.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-[10px] text-text-muted italic max-w-xs truncate">{e.comments || '—'}</td>
                            <td className="py-3.5 px-3 text-right">
                              {e.status === 'Pending' ? (
                                <button 
                                  onClick={() => handleDeletePendingExpense(e.id)}
                                  className="px-2.5 py-1.5 bg-brand-error/10 hover:bg-brand-error/20 border border-brand-error/20 text-brand-error rounded-lg text-[9px] uppercase tracking-wide font-black transition-colors cursor-pointer shadow-sm"
                                >
                                  Withdraw
                                </button>
                              ) : (
                                <span className="text-xs text-text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default UserExpenses;
