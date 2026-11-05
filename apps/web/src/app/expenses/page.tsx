'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Receipt, 
  DollarSign, 
  Calendar, 
  Building2,
  Trash2,
  Edit2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';

import { NewExpenseModal } from '@/components/expenses/NewExpenseModal';
import { axiosInstance } from '@/lib/axios';
import { useOrganization } from '@/features/organizations/api/get-organization';

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: currentOrganization } = useOrganization();
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  // Theme support for solid background native select dropdown options
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidMenuBg = isDark ? '#1E293B' : '#ffffff'; 
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get('/expenses');
      const data = res.data?.data?.expenses || res.data?.expenses || res.data?.data || res.data || [];
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch expenses', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filteredExpenses = expenses.filter((item: any) => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the expense "${title}"?`)) {
      try {
        await axiosInstance.delete(`/expenses/${id}`);
        toast.success('Expense deleted successfully');
        fetchExpenses();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to delete expense');
      }
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Expenses & Reimbursements
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track project expenses, upload receipts, and manage team reimbursements.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shrink-0 w-full sm:w-auto flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </button>
      </div>

      {/* Quick Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="enterprise-card p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/20 text-primary rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">${totalExpenseAmount.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar: Search */}
      <div className="enterprise-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses by title or description..." 
            className="input-field pl-9 bg-background text-foreground border-border"
          />
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="enterprise-table-container">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head w-[30%] pl-6">Title & Description</th>
                <th className="enterprise-table-head">Amount</th>
                <th className="enterprise-table-head">{isHealthcare ? 'Case / Project' : 'Project'}</th>
                <th className="enterprise-table-head">Date</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground bg-background">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      Loading expenses...
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground bg-background">
                    No expenses found. Click "Add Expense" to create one.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense: any) => (
                  <tr key={expense.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                    
                    <td className="enterprise-table-cell pl-6">
                      <div className="font-semibold text-foreground text-base group-hover:text-info transition-colors">
                        {expense.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {expense.description || 'No description'}
                      </div>
                    </td>

                    <td className="enterprise-table-cell font-mono font-bold text-success">
                      ${Number(expense.amount || 0).toFixed(2)}
                    </td>

                    <td className="enterprise-table-cell text-muted-foreground font-medium">
                      {expense.project?.name || 'General / Internal'}
                    </td>

                    <td className="enterprise-table-cell text-muted-foreground">
                      {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="enterprise-table-cell text-right pr-6">
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors float-right">
                        <MoreVertical className="absolute w-5 h-5 text-muted-foreground pointer-events-none" style={{ zIndex: 1 }} />
                        <select
                          title="Actions"
                          className="absolute inset-0 w-full h-full cursor-pointer dark:[color-scheme:dark]"
                          style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none', zIndex: 10 }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'delete') handleDelete(expense.id, expense.title);
                            e.target.value = 'default';
                          }}
                          defaultValue="default"
                        >
                          <option value="default" disabled hidden>⚙️ Actions</option>
                          <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>🗑️ Delete</option>
                        </select>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewExpenseModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchExpenses();
        }}
      />
      
    </div>
  );
}
