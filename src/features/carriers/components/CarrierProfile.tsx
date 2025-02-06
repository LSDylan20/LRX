import React, { useState, useEffect } from 'react';

import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';

import type { Database } from '../../../lib/database.types';

interface CarrierProfileData {
  mc_number: string;
  dot_number: string;
  insurance_expiry: string;
  equipment_types: string[];
  service_areas: string[];
}

export default function CarrierProfile() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CarrierProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<CarrierProfileData>({
    mc_number: '',
    dot_number: '',
    insurance_expiry: '',
    equipment_types: [],
    service_areas: [],
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('carrier_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
        setFormData(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('carrier_profiles')
        .upsert({
          user_id: user?.id,
          ...formData,
        });

      if (error) throw error;
      await fetchProfile();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'equipment_types' | 'service_areas') => {
    const values = e.target.value.split(',').map(v => v.trim());
    setFormData(prev => ({ ...prev, [field]: values }));
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Carrier Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">MC Number</label>
            <input
              type="text"
              name="mc_number"
              value={formData.mc_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">DOT Number</label>
            <input
              type="text"
              name="dot_number"
              value={formData.dot_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Insurance Expiry</label>
            <input
              type="date"
              name="insurance_expiry"
              value={formData.insurance_expiry}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Equipment Types (comma-separated)</label>
            <input
              type="text"
              value={formData.equipment_types.join(', ')}
              onChange={(e) => handleArrayChange(e, 'equipment_types')}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Service Areas (comma-separated)</label>
            <input
              type="text"
              value={formData.service_areas.join(', ')}
              onChange={(e) => handleArrayChange(e, 'service_areas')}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700">MC Number</h3>
            <p className="text-gray-600">{profile?.mc_number || 'Not provided'}</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">DOT Number</h3>
            <p className="text-gray-600">{profile?.dot_number || 'Not provided'}</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Insurance Expiry</h3>
            <p className="text-gray-600">
              {profile?.insurance_expiry
                ? new Date(profile.insurance_expiry).toLocaleDateString()
                : 'Not provided'}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Equipment Types</h3>
            <div className="flex flex-wrap gap-2">
              {profile?.equipment_types.map((type) => (
                <span
                  key={type}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">Service Areas</h3>
            <div className="flex flex-wrap gap-2">
              {profile?.service_areas.map((area) => (
                <span
                  key={area}
                  className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}