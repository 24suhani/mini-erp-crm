import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, Users, FileText, Plus, Search, LogOut, 
  AlertTriangle, CheckCircle, ArrowDownRight, ArrowUpRight, Calendar
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  
  // Auth Form
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('ADMIN');

  // Navigation
  const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'challans' | 'movements'>('inventory');

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', category: 'Hardware', unitPrice: 0, currentStock: 0, minStockAlert: 5, location: 'A-1' });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', email: '', businessName: '', gstNumber: '', type: 'Wholesale', address: '', status: 'Lead', followUpDate: '', notes: '' });

  const [showChallanModal, setShowChallanModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [challanItems, setChallanItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [challanStatus, setChallanStatus] = useState<'Draft' | 'Confirmed'>('Confirmed');

  useEffect(() => {
    if (token) fetchData();
  }, [token, activeTab, searchQuery]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (activeTab === 'inventory') {
        const res = await axios.get(`${API_BASE}/products`, { headers });
        setProducts(res.data);
      } else if (activeTab === 'customers') {
        const res = await axios.get(`${API_BASE}/customers?search=${searchQuery}`, { headers });
        setCustomers(res.data);
      } else if (activeTab === 'challans') {
        const res = await axios.get(`${API_BASE}/challans`, { headers });
        setChallans(res.data);
      } else if (activeTab === 'movements') {
        const res = await axios.get(`${API_BASE}/stock-movements`, { headers });
        setMovements(res.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { name, email, password, role } : { email, password };
      const res = await axios.post(`${API_BASE}${endpoint}`, payload);
      if (!isRegister) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
      } else {
        alert('Registration successful! Please log in.');
        setIsRegister(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/products`, newProduct, { headers: { Authorization: `Bearer ${token}` } });
      setShowProductModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add product');
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/customers`, newCustomer, { headers: { Authorization: `Bearer ${token}` } });
      setShowCustomerModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add customer');
    }
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/challans`, {
        customerId: selectedCustomerId,
        items: challanItems,
        status: challanStatus
      }, { headers: { Authorization: `Bearer ${token}` } });

      setShowChallanModal(false);
      setChallanItems([]);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create challan');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border">
          <h1 className="text-2xl font-bold text-center text-slate-800">Mini ERP + CRM</h1>
          <p className="text-center text-slate-500 text-sm mb-6">{isRegister ? 'Register your account' : 'Sign in to access dashboard'}</p>
          <form onSubmit={handleAuth} className="space-y-3">
            {isRegister && <input type="text" placeholder="Full Name" required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg text-sm" />}
            <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded-lg text-sm" />
            <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2 rounded-lg text-sm" />
            {isRegister && (
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                <option value="ADMIN">ADMIN</option>
                <option value="SALES">SALES</option>
                <option value="WAREHOUSE">WAREHOUSE</option>
                <option value="ACCOUNTS">ACCOUNTS</option>
              </select>
            )}
            <button type="submit" className="w-full bg-blue-600 text-white p-2.5 rounded-lg text-sm font-semibold">{isRegister ? 'Register' : 'Sign In'}</button>
          </form>
          <button onClick={() => setIsRegister(!isRegister)} className="mt-4 text-xs text-blue-600 block text-center w-full">
            {isRegister ? 'Already registered? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-blue-600 text-white p-2 rounded-lg"><Package size={20} /></div>
            <span className="font-bold text-white text-lg">ERP + CRM</span>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Package size={18} /><span>Inventory</span></button>
            <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium ${activeTab === 'customers' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Users size={18} /><span>Customer CRM</span></button>
            <button onClick={() => setActiveTab('challans')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium ${activeTab === 'challans' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><FileText size={18} /><span>Sales Challans</span></button>
            <button onClick={() => setActiveTab('movements')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium ${activeTab === 'movements' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><ArrowDownRight size={18} /><span>Stock Logs</span></button>
          </nav>
        </div>
        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-500 font-medium">LOGGED IN AS</p>
          <p className="text-sm font-semibold text-white">{user?.name}</p>
          <p className="text-xs text-blue-400 font-mono mb-3">{user?.role}</p>
          <button onClick={() => { localStorage.clear(); setToken(null); }} className="w-full flex items-center space-x-2 text-rose-400 hover:text-rose-300 text-sm"><LogOut size={16} /><span>Sign Out</span></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 capitalize">{activeTab}</h1>
            <p className="text-slate-500 text-sm">Enterprise management portal</p>
          </div>
          {activeTab === 'inventory' && <button onClick={() => setShowProductModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"><Plus size={16} /><span>Add Product</span></button>}
          {activeTab === 'customers' && <button onClick={() => setShowCustomerModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"><Plus size={16} /><span>Add Customer</span></button>}
          {activeTab === 'challans' && <button onClick={() => { setShowChallanModal(true); if(products.length === 0) fetchData(); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"><Plus size={16} /><span>Create Challan</span></button>}
        </header>

        {activeTab === 'customers' && (
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Search by name, business, or mobile..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}

        {/* Tab 1: Inventory */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr><th className="p-4">SKU</th><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Unit Price</th><th className="p-4">Stock</th><th className="p-4">Location</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="p-4 font-mono text-slate-500">{p.sku}</td>
                    <td className="p-4 font-semibold text-slate-800">{p.name}</td>
                    <td className="p-4 text-slate-600">{p.category}</td>
                    <td className="p-4 font-medium">₹{p.unitPrice}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.currentStock <= p.minStockAlert ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {p.currentStock} units
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{p.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Customer CRM */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr><th className="p-4">Customer & Business</th><th className="p-4">Contact & GST</th><th className="p-4">Address</th><th className="p-4">Type & Status</th><th className="p-4">Follow-Up / Notes</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                  <tr key={c.id}>
                    <td className="p-4"><div className="font-semibold text-slate-800">{c.businessName}</div><div className="text-xs text-slate-500">{c.name}</div></td>
                    <td className="p-4 text-slate-600"><div>{c.mobile}</div><div className="text-xs text-slate-400">GST: {c.gstNumber || 'N/A'}</div></td>
                    <td className="p-4 text-slate-500 text-xs">{c.address || 'No address specified'}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mr-2">{c.type}</span><span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">{c.status}</span></td>
                    <td className="p-4 text-xs text-slate-600"><div>{c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : 'No date'}</div><div className="text-slate-400 italic">{c.notes}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Sales Challans */}
        {activeTab === 'challans' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr><th className="p-4">Challan #</th><th className="p-4">Customer</th><th className="p-4">Total Qty</th><th className="p-4">Status</th><th className="p-4">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challans.map(ch => (
                  <tr key={ch.id}>
                    <td className="p-4 font-mono font-semibold text-blue-600">{ch.challanNumber}</td>
                    <td className="p-4 font-medium text-slate-800">{ch.customer?.businessName || 'Customer'}</td>
                    <td className="p-4 font-medium">{ch.totalQuantity} items</td>
                    <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ch.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ch.status}</span></td>
                    <td className="p-4 text-slate-500 text-xs">{new Date(ch.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Stock Movement Logs */}
        {activeTab === 'movements' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr><th className="p-4">Type</th><th className="p-4">Product</th><th className="p-4">Quantity</th><th className="p-4">Reason</th><th className="p-4">Logged By</th><th className="p-4">Timestamp</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map(m => (
                  <tr key={m.id}>
                    <td className="p-4"><span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold ${m.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{m.type === 'IN' ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}<span>{m.type}</span></span></td>
                    <td className="p-4 font-semibold text-slate-800">{m.product?.name}</td>
                    <td className="p-4 font-medium">{m.quantity}</td>
                    <td className="p-4 text-slate-600">{m.reason}</td>
                    <td className="p-4 text-slate-500 text-xs">{m.user?.name}</td>
                    <td className="p-4 text-slate-400 text-xs">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: Add Customer */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl border">
            <h2 className="text-lg font-bold mb-4">Add Customer Lead</h2>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Contact Name" required className="border rounded p-2 text-sm" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                <input type="text" placeholder="Business Name" required className="border rounded p-2 text-sm" value={newCustomer.businessName} onChange={e => setNewCustomer({...newCustomer, businessName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Mobile Number" required className="border rounded p-2 text-sm" value={newCustomer.mobile} onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})} />
                <input type="email" placeholder="Email Address" required className="border rounded p-2 text-sm" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="GST Number (Optional)" className="border rounded p-2 text-sm" value={newCustomer.gstNumber} onChange={e => setNewCustomer({...newCustomer, gstNumber: e.target.value})} />
                <select className="border rounded p-2 text-sm" value={newCustomer.type} onChange={e => setNewCustomer({...newCustomer, type: e.target.value})}>
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Distributor">Distributor</option>
                </select>
              </div>
              <textarea placeholder="Address" className="w-full border rounded p-2 text-sm" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}></textarea>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" placeholder="Follow-Up Date" className="border rounded p-2 text-sm" value={newCustomer.followUpDate} onChange={e => setNewCustomer({...newCustomer, followUpDate: e.target.value})} />
                <input type="text" placeholder="Notes" className="border rounded p-2 text-sm" value={newCustomer.notes} onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-medium">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Challan */}
      {showChallanModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl border">
            <h2 className="text-lg font-bold mb-4">Create Sales Challan</h2>
            <form onSubmit={handleCreateChallan} className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Select Customer</label>
                <select required className="w-full border rounded p-2 text-sm mt-1" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.businessName} ({c.name})</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Select Product</label>
                <div className="flex space-x-2 mt-1">
                  <select id="pSelect" className="flex-1 border rounded p-2 text-sm">
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>)}
                  </select>
                  <input id="pQty" type="number" min="1" defaultValue="1" className="w-20 border rounded p-2 text-sm" />
                  <button type="button" onClick={() => {
                    const pId = (document.getElementById('pSelect') as HTMLSelectElement).value;
                    const qty = Number((document.getElementById('pQty') as HTMLInputElement).value);
                    if (pId && qty > 0) setChallanItems([...challanItems, { productId: pId, quantity: qty }]);
                  }} className="bg-slate-800 text-white px-3 py-2 rounded text-xs">Add</button>
                </div>
              </div>

              <div className="border rounded p-2 max-h-32 overflow-y-auto space-y-1">
                {challanItems.map((item, idx) => {
                  const p = products.find(prod => prod.id === item.productId);
                  return <div key={idx} className="text-xs flex justify-between bg-slate-50 p-1.5 rounded"><span>{p?.name}</span><span className="font-semibold">{item.quantity} units</span></div>;
                })}
              </div>

              <div>
                <label className="text-xs font-semibold">Challan Status</label>
                <select className="w-full border rounded p-2 text-sm mt-1" value={challanStatus} onChange={e => setChallanStatus(e.target.value as any)}>
                  <option value="Confirmed">Confirmed (Reduces Stock)</option>
                  <option value="Draft">Draft (No Stock Change)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowChallanModal(false)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-medium">Generate Challan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}