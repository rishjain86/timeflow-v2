'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios';
import { useTheme } from 'next-themes';
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 NEW: Fetched for feature toggling

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDataModal({ isOpen, onClose }: ImportDataModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentOrganization } = useOrganization(); // 🟢 NEW: Get current org context

  // 🟢 EXACT THEME FIX: Ensures solid background in Dark Mode without touching Light Mode
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidBg = isDark ? 'bg-[#0F172A]' : 'bg-white';

  if (!isOpen) return null;

  // 🟢 NEW: Dynamic Headers based on Industry Type
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';
  const requiredHeaders = isHealthcare 
    ? [
        'Date', 'Patient Name', 'Client (Case Owner)', 'Logged By', 'Plan Type', 'Modality', 'HCAI Number', 
        'Project Description', 'Project Budget', 'Allocated Hours', 
        'Task Name', 'Is Billable', 'Hours', 'Billable Rate', 'Notes', 'Approver'
      ]
    : [
        'Date', 'Project Name', 'Client', 'Logged By', 'Category', 'PO Number', 'Reference Number', 
        'Project Description', 'Project Budget', 'Allocated Hours', 
        'Task Name', 'Is Billable', 'Hours', 'Billable Rate', 'Notes', 'Approver'
      ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
    } else {
      toast.error('Please upload a valid CSV or Excel file.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const text = await selectedFile.text();
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      if (rows.length < 2) {
        toast.error("File is empty or invalid.");
        setIsUploading(false);
        return;
      }

      const headers = rows[0].split(',').map(h => h.trim());

      const parsedData = rows.slice(1).map(row => {
        const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });
        return rowData;
      });

      await axiosInstance.post('/projects/import', { data: parsedData });

      toast.success(`${selectedFile.name} imported successfully! Data mapped to TimeFlow.`);
      onClose();
      
      window.location.reload(); 
      
    } catch (error: any) {
      console.error("Import failed:", error);
      toast.error(error?.response?.data?.message || 'Failed to process the import file.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 animate-in fade-in p-4 backdrop-blur-sm">
      <div className={`w-full max-w-3xl border border-border shadow-2xl rounded-[20px] overflow-hidden flex flex-col ${solidBg}`}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-foreground">Import Data</h2>
          </div>
          <button onClick={onClose} disabled={isUploading} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Mandatory Headers Required</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Ensure your CSV file contains the following exact column names before uploading. All other legacy columns will be safely ignored during mapping.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {/* 🟢 UPDATED: Mapping the dynamic requiredHeaders array */}
                {requiredHeaders.map((header) => {
                  const isHighlighted = ['Project Description', 'Project Budget', 'Allocated Hours', 'Is Billable'].includes(header);
                  return (
                    <span key={header} className={`px-2 py-1 bg-background border text-xs rounded-md font-medium ${
                      isHighlighted ? 'border-info/50 text-info bg-info/5' : 'border-border text-muted-foreground'
                    }`}>
                      {header}
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-info mt-2">
                * Note: <span className="font-semibold">Project Budget</span>, <span className="font-semibold">Project Description</span>, and <span className="font-semibold">Allocated Hours</span> have been added to set strict project limits automatically. <span className="font-semibold">Is Billable</span> maps task automation.
              </p>
            </div>
          </div>

          {!selectedFile ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-background hover:border-emerald-500/50 hover:bg-accent/50'}`}
            >
              <UploadCloud className={`w-10 h-10 mx-auto mb-3 transition-colors ${isDragging ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              <h3 className="text-foreground font-medium mb-1">Drag and drop your file here</h3>
              <p className="text-xs text-muted-foreground mb-4">Supports .CSV files up to 50MB</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".csv" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm px-4 py-2"
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 border border-border rounded-lg flex items-center justify-center ${solidBg}`}>
                  <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground truncate max-w-[400px]">{selectedFile.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{(selectedFile.size / 1024).toFixed(2)} KB • Ready to import</p>
                </div>
              </div>
              <button 
                onClick={removeFile}
                disabled={isUploading}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/50">
          <button onClick={onClose} disabled={isUploading} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><CheckCircle className="w-4 h-4" /> Start Import</>}
          </button>
        </div>

      </div>
    </div>
  );
}
