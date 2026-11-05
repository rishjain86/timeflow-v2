"use client";
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import Link from 'next/link';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['organization', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/organizations/${id}`);
      return res.data?.data || res.data;
    }
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading organization details...</div>;
  if (error || !data) return <div className="p-8 text-red-400">Organization not found or error loading data.</div>;

  const org = data.organization || data; // Adjust based on exact backend response

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Organization Details</h1>
        <Link 
          href="/settings" 
          className="px-4 py-2 text-sm font-medium border border-slate-700 text-slate-300 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
        >
          Back to Settings
        </Link>
      </div>

      <div className="bg-[#0F172A] p-6 rounded-xl shadow-lg border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-400">Organization Name</label>
            <p className="mt-1 text-lg font-medium text-white">{org.name}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-400">Legal Company Name</label>
            <p className="mt-1 text-lg font-medium text-white">{org.companyName || 'Not specified'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400">Timezone</label>
            <p className="mt-1 text-lg font-medium text-white">{org.timeZone}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400">Currency</label>
            <p className="mt-1 text-lg font-medium text-white">{org.defaultCurrency}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400">Date Format</label>
            <p className="mt-1 text-lg font-medium text-white">{org.dateFormat}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400">Status</label>
            <p className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
                org.isActive 
                  ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' 
                  : 'bg-red-900/30 text-red-400 border-red-800/50'
              }`}>
                {org.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
