import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import type { Database } from '../../../lib/database.types';

type LoadInsert = Database['public']['Tables']['loads']['Insert'];

interface LoadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function LoadForm({ onSuccess, onCancel }: LoadFormProps) {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<LoadInsert>>({
    origin: '',
    destination: '',
    pickup_date: '',
    delivery_date: '',
    equipment_type: '',
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    special_instructions: '',
    load_type: 'FCL',
    customer_reference: '',
    bill_of_lading_number: '',
    rate: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('loads')
        .insert({
          ...formData,
          shipper_id: user.id,
          status: 'posted',
        });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDimensionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions as { length: number; width: number; height: number },
        [name]: parseFloat(value) || 0
      }
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Post a Load</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="origin" className="block text-gray-700 mb-2">
              Origin
            </label>
            <input
              id="origin"
              name="origin"
              type="text"
              value={formData.origin}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="destination" className="block text-gray-700 mb-2">
              Destination
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              value={formData.destination}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="pickup_date" className="block text-gray-700 mb-2">
              Pickup Date
            </label>
            <input
              id="pickup_date"
              name="pickup_date"
              type="datetime-local"
              value={formData.pickup_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="delivery_date" className="block text-gray-700 mb-2">
              Delivery Date
            </label>
            <input
              id="delivery_date"
              name="delivery_date"
              type="datetime-local"
              value={formData.delivery_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="equipment_type" className="block text-gray-700 mb-2">
              Equipment Type
            </label>
            <select
              id="equipment_type"
              name="equipment_type"
              value={formData.equipment_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">Select equipment type</option>
              <option value="dry_van">Dry Van</option>
              <option value="reefer">Reefer</option>
              <option value="flatbed">Flatbed</option>
              <option value="step_deck">Step Deck</option>
              <option value="lowboy">Lowboy</option>
            </select>
          </div>

          <div>
            <label htmlFor="weight" className="block text-gray-700 mb-2">
              Weight (lbs)
            </label>
            <input
              id="weight"
              name="weight"
              type="number"
              value={formData.weight}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="load_type" className="block text-gray-700 mb-2">
              Load Type
            </label>
            <select
              id="load_type"
              name="load_type"
              value={formData.load_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="FCL">Full Container Load (FCL)</option>
              <option value="LTL">Less Than Truckload (LTL)</option>
            </select>
          </div>

          <div>
            <label htmlFor="rate" className="block text-gray-700 mb-2">
              Rate (USD)
            </label>
            <input
              id="rate"
              name="rate"
              type="number"
              value={formData.rate || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Leave blank for rate inquiry"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="length" className="block text-gray-700 mb-2">
              Length (ft)
            </label>
            <input
              id="length"
              name="length"
              type="number"
              value={(formData.dimensions as any)?.length || 0}
              onChange={handleDimensionsChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="width" className="block text-gray-700 mb-2">
              Width (ft)
            </label>
            <input
              id="width"
              name="width"
              type="number"
              value={(formData.dimensions as any)?.width || 0}
              onChange={handleDimensionsChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="height" className="block text-gray-700 mb-2">
              Height (ft)
            </label>
            <input
              id="height"
              name="height"
              type="number"
              value={(formData.dimensions as any)?.height || 0}
              onChange={handleDimensionsChange}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="special_instructions" className="block text-gray-700 mb-2">
            Special Instructions
          </label>
          <textarea
            id="special_instructions"
            name="special_instructions"
            value={formData.special_instructions}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customer_reference" className="block text-gray-700 mb-2">
              Customer Reference
            </label>
            <input
              id="customer_reference"
              name="customer_reference"
              type="text"
              value={formData.customer_reference}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label htmlFor="bill_of_lading_number" className="block text-gray-700 mb-2">
              Bill of Lading Number
            </label>
            <input
              id="bill_of_lading_number"
              name="bill_of_lading_number"
              type="text"
              value={formData.bill_of_lading_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Load'}
          </button>
        </div>
      </form>
    </div>
  );
}