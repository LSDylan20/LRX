import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { File, Upload, X, FileText } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentUploadProps {
  loadId: string;
  onUploadComplete?: () => void;
}

export default function DocumentUpload({ loadId, onUploadComplete }: DocumentUploadProps) {
  const user = useAuthStore((state) => state.user);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState('bill_of_lading');
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, [loadId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setError(null);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${loadId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record in the database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          load_id: loadId,
          carrier_id: user?.id,
          document_type: documentType,
          file_path: filePath,
        });

      if (dbError) throw dbError;

      // Refresh documents list
      fetchDocuments();
      if (onUploadComplete) onUploadComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('load_id', loadId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Refresh documents list
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="bill_of_lading">Bill of Lading</option>
              <option value="proof_of_delivery">Proof of Delivery</option>
              <option value="rate_confirmation">Rate Confirmation</option>
              <option value="insurance">Insurance Document</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="relative">
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500"
            >
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="text-sm text-gray-600">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </div>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Documents</h3>
        
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-md"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{doc.document_type}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const { data } = supabase.storage
                      .from('documents')
                      .getPublicUrl(doc.file_path);
                    window.open(data.publicUrl, '_blank');
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <File className="h-5 w-5" />
                </button>
                
                {user?.id === doc.carrier_id && (
                  <button
                    onClick={() => deleteDocument(doc.id, doc.file_path)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No documents uploaded yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}