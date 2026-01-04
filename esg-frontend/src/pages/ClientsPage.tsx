import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  FolderIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Interface for client data
interface Client {
  id: string;
  name: string;
  createdAt: string;
  counts: {
    portfolios: number;
    users: number;
    customParameters: number;
    selectedParameters: number;
    criteriaSets: number;
  };
}

const ClientsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate('/portfolios');
    }
  }, [isAdmin, navigate]);

  // Fetch clients
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getClients();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
    }
  }, [isAdmin]);

  // Open create modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingClient(null);
    setClientName('');
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (client: Client) => {
    setModalMode('edit');
    setEditingClient(client);
    setClientName(client.name);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setClientName('');
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiService.createClient({ name: clientName.trim() });
        setSuccessMessage('Client created successfully');
      } else if (editingClient) {
        await apiService.updateClient(editingClient.id, { name: clientName.trim() });
        setSuccessMessage('Client updated successfully');
      }
      closeModal();
      await fetchClients();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await apiService.deleteClient(deleteConfirm.id);
      setSuccessMessage('Client deleted successfully');
      setDeleteConfirm(null);
      await fetchClients();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BuildingOfficeIcon className="h-8 w-8 text-navy-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
            <p className="text-gray-500 text-sm">Add, edit, and manage client organizations</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Client
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <p className="ml-3 text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <XCircleIcon className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {clients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clients</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new client organization.</p>
          <div className="mt-6">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Client
            </button>
          </div>
        </div>
      ) : (
        /* Clients grid */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
            >
              {/* Client header */}
              <div className="bg-gradient-to-r from-navy-600 to-navy-700 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <BuildingOfficeIcon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white truncate">{client.name}</h3>
                  </div>
                </div>
              </div>

              {/* Client stats */}
              <div className="px-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">
                      <strong className="text-gray-900">{client.counts.users}</strong> Users
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FolderIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">
                      <strong className="text-gray-900">{client.counts.portfolios}</strong> Portfolios
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">
                      <strong className="text-gray-900">{client.counts.criteriaSets}</strong> Criteria Sets
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">
                      <strong className="text-gray-900">{client.counts.customParameters}</strong> Parameters
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Created: {new Date(client.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  onClick={() => openEditModal(client)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(client)}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={closeModal}
            />
            
            {/* Modal */}
            <div className="relative inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-navy-100 sm:mx-0 sm:h-10 sm:w-10">
                  <BuildingOfficeIcon className="h-6 w-6 text-navy-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {modalMode === 'create' ? 'Create New Client' : 'Edit Client'}
                  </h3>
                  <form onSubmit={handleSubmit} className="mt-4">
                    <div>
                      <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
                        Client Name
                      </label>
                      <input
                        type="text"
                        id="clientName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Enter client name"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || !clientName.trim()}
                        className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-navy-600 border border-transparent rounded-md shadow-sm hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 sm:w-auto sm:text-sm disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Client' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !isDeleting && setDeleteConfirm(null)}
            />
            
            {/* Modal */}
            <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Delete Client
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? 
                      This will also delete all associated data including:
                    </p>
                    <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                      <li>{deleteConfirm.counts.portfolios} portfolios</li>
                      <li>{deleteConfirm.counts.criteriaSets} criteria sets</li>
                      <li>{deleteConfirm.counts.customParameters} custom parameters</li>
                    </ul>
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Client'}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirm(null)}
                  className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
