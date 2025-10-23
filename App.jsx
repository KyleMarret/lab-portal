import React, { useState, useEffect } from 'react';
import { Download, Upload, Plus, Search, FileText, CheckCircle, Clock, X, Users, Edit, Trash2, Printer } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

// Generate random Plot ID
function generatePlotID() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetter = letters[Math.floor(Math.random() * letters.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${randomLetter}${randomNum}`;
}

// Generate random batch number for display (before real one is assigned)
function generateRandomBatchNumber() {
  return Math.floor(10000 + Math.random() * 90000);
}

function App() {
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showClientManager, setShowClientManager] = useState(false);
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
    fetchStats();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch(`${API_BASE}/batches/`);
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const downloadLabCSV = async (batchId) => {
    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}/download-csv`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${batchId}_lab_submission.csv`;
      a.click();
    } catch (err) {
      alert('Failed to download CSV');
    }
  };

  const generateLabCSV = async (batchId) => {
    try {
      await fetch(`${API_BASE}/batches/${batchId}/generate-csv`, { method: 'POST' });
      alert('CSV Generated! Click Download to get file.');
      fetchBatches();
    } catch (err) {
      alert('Failed to generate CSV');
    }
  };

  const deleteBatch = async (batchId) => {
    if (!window.confirm(`Delete batch ${batchId}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Batch deleted successfully');
        fetchBatches();
        fetchStats();
      } else {
        alert('Failed to delete batch');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      'Pending': 'bg-gray-100 text-gray-700',
      'CSV Generated': 'bg-blue-100 text-blue-700',
      'Sent to Lab': 'bg-yellow-100 text-yellow-700',
      'Lab Results Received': 'bg-green-100 text-green-700',
      'Completed': 'bg-green-500 text-white'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Soil Submission Portal</h1>
              <p className="text-sm text-gray-500 mt-1">Phase 1 - Internal Use</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClientManager(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Users size={20} />
                Client Manager
              </button>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Submit Samples
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard icon={<FileText />} label="Total Batches" value={stats.total_batches} />
            <StatCard icon={<CheckCircle />} label="Completed" value={stats.completed_batches} />
            <StatCard icon={<Clock />} label="Total Samples" value={stats.total_samples} />
            <StatCard icon={<FileText />} label="Companies" value={stats.total_companies} />
          </div>
        </div>
      )}

      {/* Batches Table */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Submission Batches</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No submissions yet. Click "Submit Samples" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Samples</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                 {batches.map((batch) => (
                    <tr 
                      key={batch.batch_id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedBatchId(batch.batch_id);
                        setShowBatchDetails(true);
                      }}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {batch.full_batch_id || batch.batch_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{batch.company_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{batch.sample_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(batch.submission_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {!batch.csv_generated ? (
                            <button
                              onClick={() => generateLabCSV(batch.batch_id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Generate CSV
                            </button>
                          ) : (
                            <button
                              onClick={() => downloadLabCSV(batch.batch_id)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              <Download size={16} />
                              Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitModal
          onClose={() => setShowSubmitModal(false)}
          onSuccess={() => {
            fetchBatches();
            fetchStats();
            setShowSubmitModal(false);
          }}
        />
      )}

      {/* Client Manager Modal */}
      {showClientManager && (
        <ClientManagerModal
          onClose={() => setShowClientManager(false)}
        />
      )}

      {/* Batch Details Modal */}
      {showBatchDetails && selectedBatchId && (
        <BatchDetailsModal
          batchId={selectedBatchId}
          onClose={() => {
            setShowBatchDetails(false);
            setSelectedBatchId(null);
          }}
          onDelete={() => {
            deleteBatch(selectedBatchId);
            setShowBatchDetails(false);
            setSelectedBatchId(null);
          }}
          onGenerateCSV={() => generateLabCSV(selectedBatchId)}
          onDownloadCSV={() => downloadLabCSV(selectedBatchId)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function SubmitModal({ onClose, onSuccess }) {
  const [companies, setCompanies] = useState([]);
  const [growers, setGrowers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedGrower, setSelectedGrower] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState(null);
  
  const [samples, setSamples] = useState([]);
  const [editingSampleIndex, setEditingSampleIndex] = useState(null);
  const [displayBatchNumber] = useState(generateRandomBatchNumber());

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const res = await fetch(`${API_BASE}/companies/`);
    const data = await res.json();
    setCompanies(data);
  };

  const fetchGrowers = async (companyId) => {
    const res = await fetch(`${API_BASE}/growers/company/${companyId}`);
    const data = await res.json();
    setGrowers(data);
  };

  const fetchFarms = async (growerId) => {
    const res = await fetch(`${API_BASE}/farms/grower/${growerId}`);
    const data = await res.json();
    setFarms(data);
  };

  const fetchFields = async (farmId) => {
    const res = await fetch(`${API_BASE}/fields/farm/${farmId}`);
    const data = await res.json();
    setFields(data);
  };

  const handleCompanyChange = async (e) => {
    const companyId = parseInt(e.target.value);
    setSelectedCompany(companyId);
    setSelectedGrower(null);
    setSelectedFarm(null);
    setGrowers([]);
    setFarms([]);
    setFields([]);
    if (companyId) await fetchGrowers(companyId);
  };

  const handleGrowerChange = async (e) => {
    const growerId = parseInt(e.target.value);
    setSelectedGrower(growerId);
    setSelectedFarm(null);
    setFarms([]);
    setFields([]);
    if (growerId) await fetchFarms(growerId);
  };

  const handleFarmChange = async (e) => {
    const farmId = parseInt(e.target.value);
    setSelectedFarm(farmId);
    setFields([]);
    if (farmId) await fetchFields(farmId);
  };

  const addSample = () => {
    const previousSample = samples.length > 0 ? samples[samples.length - 1] : null;
    
    const newSample = {
      field_id: previousSample?.field_id || null,
      sample_name: '',
      zone: '',
      plot_id: generatePlotID(),
      crop: previousSample?.crop || '',
      yield_goal: previousSample?.yield_goal || '',
      previous_crop: previousSample?.previous_crop || '',
      previous_crop_yield: previousSample?.previous_crop_yield || '',
      lime_history: previousSample?.lime_history ? [...previousSample.lime_history] : [],
      program_level: previousSample?.program_level || 'Excellent',
      organic: previousSample?.organic || false,
      tests: {
        test_b: true, test_ca: true, test_cu: true, test_fe: true,
        test_k: true, test_mg: true, test_mn: true, test_na: true,
        test_om: true, test_p2: true, test_ph1: true, test_s: true, test_zn: true,
        test_cl: previousSample?.tests?.test_cl || false,
        test_co: previousSample?.tests?.test_co || false,
        test_mo: previousSample?.tests?.test_mo || false,
        test_salts: previousSample?.tests?.test_salts || false,
        test_bulk_den: previousSample?.tests?.test_bulk_den || false,
        test_olsen: previousSample?.tests?.test_olsen || false,
        test_nh3: previousSample?.tests?.test_nh3 || false,
        test_no3: previousSample?.tests?.test_no3 || false,
        test_ssc: previousSample?.tests?.test_ssc || false
      }
    };
    setSamples([...samples, newSample]);
  };

  const updateSample = (index, updatedSample) => {
    const updated = [...samples];
    updated[index] = updatedSample;
    setSamples(updated);
  };

  const removeSample = (index) => {
    setSamples(samples.filter((_, i) => i !== index));
  };

  const getSampleSummary = (sample, idx) => {
    const company = companies.find(c => c.id === selectedCompany);
    const grower = growers.find(g => g.id === selectedGrower);
    const farm = farms.find(f => f.id === selectedFarm);
    const field = fields.find(f => f.id === sample.field_id);
    
    const firstLine = [];
    if (company) firstLine.push(company.company_name.toUpperCase());
    if (farm) firstLine.push(farm.farm_name.toUpperCase());
    if (field) firstLine.push(field.field_name.toUpperCase());
    if (sample.sample_name) firstLine.push(sample.sample_name.toUpperCase());
    if (sample.zone) firstLine.push(`Zone: ${sample.zone}`);
    
    const bagId = `${displayBatchNumber}-${idx + 1}`;
    firstLine.push(`Bag: ${bagId}`);
    
    const optionalTests = [];
    if (sample.tests.test_cl) optionalTests.push('Cl');
    if (sample.tests.test_co) optionalTests.push('Co');
    if (sample.tests.test_mo) optionalTests.push('Mo');
    if (sample.tests.test_salts) optionalTests.push('Salts');
    if (sample.tests.test_bulk_den) optionalTests.push('Bulk Density');
    if (sample.tests.test_olsen) optionalTests.push('Olsen');
    if (sample.tests.test_nh3) optionalTests.push('NH3');
    if (sample.tests.test_no3) optionalTests.push('NO3');
    if (sample.tests.test_ssc) optionalTests.push('SSC');
    
    const testLine = optionalTests.length > 0 
      ? `Standard Analysis, ${optionalTests.join(', ')}`
      : 'Standard Analysis';
    
    const isQuarantine = company && company.is_outside_us;
    
    return { firstLine: firstLine.join(' • '), testLine, isQuarantine };
  };

  const submitBatch = async () => {
    if (!selectedCompany || !selectedGrower || samples.length === 0) {
      alert('Please complete all required fields');
      return;
    }

    const payload = {
      company_id: selectedCompany,
      samples: samples.map(s => ({
        grower_id: selectedGrower,
        farm_id: selectedFarm || null,
        field_id: s.field_id || null,
        sample_name: s.sample_name,
        zone: s.zone,
        plot_id: s.plot_id,
        crop: s.crop,
        yield_goal: s.yield_goal ? parseFloat(s.yield_goal) : null,
        previous_crop: s.previous_crop,
        previous_crop_yield: s.previous_crop_yield ? parseFloat(s.previous_crop_yield) : null,
        lime_history: s.lime_history,
        program_level: s.program_level,
        organic: s.organic,
        tests: s.tests
      }))
    };

    try {
      const res = await fetch(`${API_BASE}/batches/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`Batch ${data.batch_id} created with ${data.sample_count} samples!`);
        onSuccess();
      } else {
        alert('Failed to create batch');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Submit Soil Samples</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">X</button>
          </div>

          <div className="p-6 space-y-6">
            {/* Company/Grower Selection */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
                <select
                  value={selectedCompany || ''}
                  onChange={handleCompanyChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grower *</label>
                <select
                  value={selectedGrower || ''}
                  onChange={handleGrowerChange}
                  disabled={!selectedCompany}
                  className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">Select Grower</option>
                  {growers.map(g => (
                    <option key={g.id} value={g.id}>{g.grower_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Farm</label>
                <select
                  value={selectedFarm || ''}
                  onChange={handleFarmChange}
                  disabled={!selectedGrower}
                  className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">Select Farm</option>
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>{f.farm_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Samples List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Samples ({samples.length})</h3>
                <button
                  onClick={addSample}
                  disabled={!selectedGrower}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Add Sample
                </button>
              </div>

              {samples.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No samples yet. Click "Add Sample" to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {samples.map((sample, idx) => {
                    const summary = getSampleSummary(sample, idx);
                    return (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer transition"
                        onClick={() => setEditingSampleIndex(idx)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-1">
                              Sample {idx + 1}
                            </div>
                            <div className="text-sm text-gray-700 mb-1">
                              {summary.firstLine || 'Click to edit'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {summary.testLine}
                              {summary.isQuarantine && (
                                <span className="ml-2 text-red-600 font-semibold">*QUARANTINE</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSample(idx);
                              }}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                            <span className="text-gray-400">x</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitBatch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Batch
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Detail Modal */}
      {editingSampleIndex !== null && (
        <SampleDetailModal
          sample={samples[editingSampleIndex]}
          sampleIndex={editingSampleIndex}
          fields={fields}
          selectedFarm={selectedFarm}
          onSave={(updatedSample) => {
            updateSample(editingSampleIndex, updatedSample);
            setEditingSampleIndex(null);
          }}
          onCancel={() => setEditingSampleIndex(null)}
        />
      )}
    </>
  );
}

// Searchable Field Component
function SearchableFieldSelect({ fields, value, onChange, disabled }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const selectedField = fields.find(f => f.id === value);
  const displayValue = selectedField ? selectedField.field_name : '';
  
  const filteredFields = fields.filter(f => 
    f.field_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSelect = (field) => {
    onChange(field.id);
    setSearchTerm('');
    setShowDropdown(false);
  };
  
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };
  
  return (
    <div className="relative">
      <input
        type="text"
        value={showDropdown ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        disabled={disabled}
        className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
        placeholder="Search or select field..."
      />
      
      {showDropdown && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredFields.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No fields found</div>
          ) : (
            filteredFields.map(field => (
              <div
                key={field.id}
                onClick={() => handleSelect(field)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                {field.field_name}
                {field.acres && <span className="text-gray-500 ml-2">({field.acres} ac)</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SampleDetailModal({ sample, sampleIndex, fields, selectedFarm, onSave, onCancel }) {
  const [editedSample, setEditedSample] = useState({...sample});
  const [loadingPlotData, setLoadingPlotData] = useState(false);
  const [showLimeModal, setShowLimeModal] = useState(false);

  const cropList = [
    'ALFALFA', 'BARLEY', 'CANOLA', 'CORN', 'COTTON', 'GARDEN', 
    'GRAPES', 'OATS', 'PEANUTS', 'RICE', 'RYE', 'SORGHUM', 
    'SOYBEANS', 'SUNFLOWERS', 'WHEAT', 'NO CROP'
  ];

  // Auto-fill from Plot ID history
  useEffect(() => {
    const checkPlotHistory = async () => {
      const plotId = editedSample.plot_id?.trim();
      if (!plotId || plotId.length < 3) return;

      setLoadingPlotData(true);
      try {
        const response = await fetch(`${API_BASE}/plot-history/${plotId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const recent = data[0];
            
            if (!editedSample.crop && recent.crop) {
              updateField('crop', recent.crop);
            }
            if (!editedSample.previous_crop && recent.previous_crop) {
              updateField('previous_crop', recent.previous_crop);
            }
            if (!editedSample.yield_goal && recent.yield_goal) {
              updateField('yield_goal', recent.yield_goal);
            }
            
            console.log(`Auto-filled data from previous submission for Plot ID: ${plotId}`);
          }
        }
      } catch (err) {
        console.error('Failed to fetch plot history:', err);
      } finally {
        setLoadingPlotData(false);
      }
    };

    const timer = setTimeout(checkPlotHistory, 500);
    return () => clearTimeout(timer);
  }, [editedSample.plot_id]);

  const updateField = (field, value) => {
    setEditedSample({...editedSample, [field]: value});
  };

  const updateTest = (testName, value) => {
    setEditedSample({
      ...editedSample,
      tests: {...editedSample.tests, [testName]: value}
    });
  };

  const addLimeEntry = (entry) => {
    const currentHistory = editedSample.lime_history || [];
    setEditedSample({
      ...editedSample,
      lime_history: [...currentHistory, entry]
    });
  };

  const removeLimeEntry = (index) => {
    const updated = editedSample.lime_history.filter((_, i) => i !== index);
    setEditedSample({...editedSample, lime_history: updated});
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Sample {sampleIndex + 1} Details</h2>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">X</button>
          </div>

          <div className="p-6 space-y-6">
            {/* Recommendation Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Recommendation Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Program Level</label>
                  <select
                    value={editedSample.program_level}
                    onChange={(e) => updateField('program_level', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Building">Building</option>
                    <option value="Minimal">Minimal</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Determines fertilizer recommendation intensity
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={editedSample.organic}
                      onChange={(e) => updateField('organic', e.target.checked)}
                      className="rounded"
                    />
                    Organic Program
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Use organic-approved fertilizers only
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plot ID *
                  </label>
                  <input
                    value={editedSample.plot_id}
                    onChange={(e) => updateField('plot_id', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., A4729"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Field</label>
                  <SearchableFieldSelect
                    fields={fields}
                    value={editedSample.field_id}
                    onChange={(fieldId) => updateField('field_id', fieldId)}
                    disabled={!selectedFarm}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sample Name</label>
                  <input
                    value={editedSample.sample_name}
                    onChange={(e) => updateField('sample_name', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Optional sample identifier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
                  <input
                    value={editedSample.zone}
                    onChange={(e) => updateField('zone', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Optional zone identifier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Crop</label>
                  <input
                    list="crop-list"
                    value={editedSample.crop}
                    onChange={(e) => updateField('crop', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Type or select: Corn, Soybeans, etc."
                  />
                  <datalist id="crop-list">
                    {cropList.map(crop => (
                      <option key={crop} value={crop} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yield Goal (unit/ac)</label>
                  <input
                    type="number"
                    value={editedSample.yield_goal}
                    onChange={(e) => updateField('yield_goal', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previous Crop</label>
                  <input
                    list="prev-crop-list"
                    value={editedSample.previous_crop}
                    onChange={(e) => updateField('previous_crop', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Type or select previous crop"
                  />
                  <datalist id="prev-crop-list">
                    {cropList.map(crop => (
                      <option key={crop} value={crop} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previous Crop Yield (unit/ac)</label>
                  <input
                    type="number"
                    value={editedSample.previous_crop_yield}
                    onChange={(e) => updateField('previous_crop_yield', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 180"
                  />
                </div>
              </div>
            </div>

            {/* Lime History */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Lime History</h3>
                <button
                  onClick={() => setShowLimeModal(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Lime
                </button>
              </div>
              
              {editedSample.lime_history && editedSample.lime_history.length > 0 ? (
                <div className="space-y-2">
                  {editedSample.lime_history.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">{entry.type}</span>
                        {' • '}
                        <span>{new Date(entry.year, entry.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        {' • '}
                        <span>{entry.amount_lbs_ac} lbs/ac</span>
                      </div>
                      <button
                        onClick={() => removeLimeEntry(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  No lime history recorded
                </div>
              )}
            </div>

            {/* Soil Tests */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Soil Tests</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                  ✓“ Standard tests included: B, Ca, Cu, Fe, K, Mg, Mn, Na, OM, P2, pH, S, Zn
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Optional Tests</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'test_cl', label: 'Chloride (Cl)' },
                    { key: 'test_co', label: 'Cobalt (Co)' },
                    { key: 'test_mo', label: 'Molybdenum (Mo)' },
                    { key: 'test_salts', label: 'Salts' },
                    { key: 'test_bulk_den', label: 'Bulk Density' },
                    { key: 'test_olsen', label: 'Olsen P' },
                    { key: 'test_nh3', label: 'NH3' },
                    { key: 'test_no3', label: 'NO3' },
                    { key: 'test_ssc', label: 'Sand/Silt/Clay' },
                  ].map(test => (
                    <label key={test.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editedSample.tests[test.key]}
                        onChange={(e) => updateTest(test.key, e.target.checked)}
                        className="rounded"
                      />
                      {test.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(editedSample)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Sample
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lime History Modal */}
      {showLimeModal && (
        <LimeHistoryModal
          onSave={addLimeEntry}
          onCancel={() => setShowLimeModal(false)}
        />
      )}
    </>
  );
}

function LimeHistoryModal({ onSave, onCancel }) {
  const [limeType, setLimeType] = useState('Calcium Carbonate');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState('');

  const limeTypes = ['Calcium Carbonate', 'Dolomite', 'Gypsum'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    onSave({
      type: limeType,
      month: month,
      year: year,
      amount_lbs_ac: parseFloat(amount)
    });

    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold">Add Lime Application</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">X</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lime Type *</label>
            <select
              value={limeType}
              onChange={(e) => setLimeType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {limeTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (lbs/ac) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., 2000"
              min="0"
              step="100"
            />
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Lime
          </button>
        </div>
      </div>
    </div>
  );
}

function BatchDetailsModal({ batchId, onClose, onDelete, onGenerateCSV, onDownloadCSV }) {
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrintLabels, setShowPrintLabels] = useState(false);

  useEffect(() => {
    fetchBatchDetails();
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}`);
      const data = await res.json();
      setBatchData(data);
    } catch (err) {
      console.error('Failed to fetch batch details:', err);
      alert('Failed to load batch details');
    } finally {
      setLoading(false);
    }
  };

  const getSampleSummary = (sample) => {
    const parts = [];
    parts.push(`Order# ${batchId}`);
    if (sample.company_name) parts.push(sample.company_name.toUpperCase());
    if (sample.farm_name) parts.push(sample.farm_name.toUpperCase());
    if (sample.field_name) parts.push(sample.field_name.toUpperCase());
    if (sample.sample_name) parts.push(sample.sample_name.toUpperCase());
    if (sample.zone) parts.push(`Zone: ${sample.zone}`);
    parts.push(`Bag: ${sample.bag_id}`);
    return parts.join(' • ');
  };

  const getTestsSummary = (sample) => {
    const optional = [];
    if (sample.test_cl) optional.push('Cl');
    if (sample.test_co) optional.push('Co');
    if (sample.test_mo) optional.push('Mo');
    if (sample.test_salts) optional.push('Salts');
    if (sample.test_bulk_den) optional.push('Bulk Density');
    if (sample.test_olsen) optional.push('Olsen');
    if (sample.test_nh3) optional.push('NH3');
    if (sample.test_no3) optional.push('NO3');
    if (sample.test_ssc) optional.push('SSC');
    const base = 'Standard Analysis';
    return optional.length > 0 ? `${base}, ${optional.join(', ')}` : base;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (!batchData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
          <div className="border-b px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Batch {batchId}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {batchData.batch.company_name} • {batchData.samples.length} samples • 
                {' '}{new Date(batchData.batch.submission_date).toLocaleDateString()}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {batchData.samples.map((sample) => {
                const summary = getSampleSummary(sample);
                const tests = getTestsSummary(sample);
                const isQuarantine = sample.quarantine;

                return (
                  <div key={sample.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">Sample {sample.sample_sequence}</div>
                      {isQuarantine && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                          QUARANTINE
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-700 mb-1">{summary}</div>
                    <div className="text-xs text-gray-600">{tests}</div>
                    
                    {sample.crop && (
                      <div className="text-xs text-gray-500 mt-2">
                        Crop: {sample.crop}
                        {sample.yield_goal && ` • Yield Goal: ${sample.yield_goal} units/ac`}
                        {sample.program_level && ` • ${sample.program_level} Program`}
                        {sample.organic && ' • Organic'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t px-6 py-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 size={18} />
                Delete Batch
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrintLabels(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Printer size={18} />
                  Print Labels
                </button>
                
                {!batchData.batch.csv_generated ? (
                  <button
                    onClick={onGenerateCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Generate CSV
                  </button>
                ) : (
                  <button
                    onClick={onDownloadCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download size={18} />
                    Download CSV
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPrintLabels && (
        <PrintLabelsModal
          batchId={batchId}
          samples={batchData.samples}
          getSampleSummary={getSampleSummary}
          getTestsSummary={getTestsSummary}
          onClose={() => setShowPrintLabels(false)}
        />
      )}
    </>
  );
}

function PrintLabelsModal({ batchId, samples, getSampleSummary, getTestsSummary, onClose }) {
  const copyToClipboard = () => {
    const text = samples.map((sample) => {
      const summary = getSampleSummary(sample);
      const tests = getTestsSummary(sample);
      const quarantine = sample.quarantine ? '\n**QUARANTINE**' : '';
      return `Sample ${sample.sample_sequence}\n${summary}\n${tests}${quarantine}\n`;
    }).join('\n---\n\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('Label text copied to clipboard!');
      onClose();
    });
  };

  const printLabels = () => {
    const labelHTML = samples.map((sample) => {
      const summary = getSampleSummary(sample);
      const tests = getTestsSummary(sample);
      const quarantine = sample.quarantine ? '<div style="color: red; font-weight: bold; margin-top: 8px;">**QUARANTINE**</div>' : '';
      
      return `
        <div style="page-break-after: always; padding: 20px; border: 2px solid #000; margin-bottom: 20px; font-family: Arial;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">Sample ${sample.sample_sequence}</div>
          <div style="font-size: 12px; margin-bottom: 8px;">${summary}</div>
          <div style="font-size: 10px; color: #666;">${tests}</div>
          ${quarantine}
        </div>
      `;
    }).join('');

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Labels - Batch ${batchId}</title>
          <style>
            body { margin: 0; padding: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${labelHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold">Print Labels - Batch {batchId}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Label Printing Options</strong><br />
                Use "Print to Browser" for standard printers or "Copy to Clipboard" to paste into your label software.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Label Preview ({samples.length} labels)</h4>
              <div className="space-y-3">
                {samples.map((sample) => {
                  const summary = getSampleSummary(sample);
                  const tests = getTestsSummary(sample);
                  const isQuarantine = sample.quarantine;

                  return (
                    <div key={sample.id} className="border rounded-lg p-4 bg-gray-50 font-mono text-xs">
                      <div className="font-bold mb-1">Sample {sample.sample_sequence}</div>
                      <div className="mb-1">{summary}</div>
                      <div className="text-gray-600">{tests}</div>
                      {isQuarantine && (
                        <div className="text-red-600 font-bold mt-1">**QUARANTINE**</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Copy to Clipboard
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={printLabels}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Printer size={18} />
              Print to Browser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientManagerModal({ onClose }) {
  const [growers, setGrowers] = useState([]);
  const [filteredGrowers, setFilteredGrowers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrower, setSelectedGrower] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllGrowers();
  }, []);

  useEffect(() => {
    // Filter growers when search term changes
    if (searchTerm.trim() === '') {
      setFilteredGrowers(growers);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = growers.filter(g => 
        g.grower_name.toLowerCase().includes(term) ||
        g.contact_person?.toLowerCase().includes(term)
      );
      setFilteredGrowers(filtered);
    }
  }, [searchTerm, growers]);

  const fetchAllGrowers = async () => {
    setLoading(true);
    try {
      // Get all companies first
      const companiesRes = await fetch(`${API_BASE}/companies/`);
      const companies = await companiesRes.json();
      
      // Get all growers for each company
      let allGrowers = [];
      for (const company of companies) {
        const growersRes = await fetch(`${API_BASE}/growers/company/${company.id}`);
        const companyGrowers = await growersRes.json();
        allGrowers = [...allGrowers, ...companyGrowers];
      }
      
      setGrowers(allGrowers);
      setFilteredGrowers(allGrowers);
    } catch (err) {
      console.error('Failed to fetch growers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedGrower(null);
    setShowAddForm(true);
  };

  const handleSelectGrower = (grower) => {
    setSelectedGrower(grower);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setSelectedGrower(null);
    fetchAllGrowers();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Client Manager</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Client List */}
          <div className="w-80 border-r flex flex-col bg-gray-50">
            {/* Search and Add */}
            <div className="p-4 space-y-3 border-b bg-white">
              <button
                onClick={handleAddNew}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={18} />
                Add Client
              </button>
              
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Grower List - UPDATED: Removed company_name display */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading clients...</div>
              ) : filteredGrowers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? 'No clients found' : 'No clients yet. Click "Add Client" to get started.'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredGrowers.map(grower => (
                    <div
                      key={grower.id}
                      onClick={() => handleSelectGrower(grower)}
                      className={`p-4 cursor-pointer hover:bg-white transition ${
                        selectedGrower?.id === grower.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{grower.grower_name}</div>
                      {grower.contact_person && (
                        <div className="text-sm text-gray-600 mt-1">{grower.contact_person}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Details/Form */}
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            {!showAddForm ? (
              <div className="text-center text-gray-500 p-8">
                <Users size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg">Select a client to view details</p>
                <p className="text-sm mt-2">or click "Add Client" to create a new one</p>
              </div>
            ) : (
              <ClientForm
                grower={selectedGrower}
                onClose={handleCloseForm}
                onSave={handleCloseForm}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Replace your ClientForm function with this version
// Adds grower address and simplifies fields to just lat/long

function ClientForm({ grower, onClose, onSave }) {
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  
  // Grower data with ADDRESS
  const [growerName, setGrowerName] = useState(grower?.grower_name || '');
  const [contactPerson, setContactPerson] = useState(grower?.contact_person || '');
  const [email, setEmail] = useState(grower?.email || '');
  const [phone, setPhone] = useState(grower?.phone || '');
  const [address, setAddress] = useState(grower?.address || '');
  const [city, setCity] = useState(grower?.city || '');
  const [state, setState] = useState(grower?.state || '');
  const [zip, setZip] = useState(grower?.zip || '');
  const [notes, setNotes] = useState(grower?.notes || '');
  
  // Farm adding state
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState('');
  const [newFarmAcres, setNewFarmAcres] = useState('');
  
  // Field adding state - simplified to just lat/long
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldFarmId, setNewFieldFarmId] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldAcres, setNewFieldAcres] = useState('');
  const [newFieldLat, setNewFieldLat] = useState('');
  const [newFieldLong, setNewFieldLong] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [grower]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (grower) {
        const farmsRes = await fetch(`${API_BASE}/farms/grower/${grower.id}`);
        const farmsData = await farmsRes.json();
        setFarms(farmsData);

        let allFields = [];
        for (const farm of farmsData) {
          const fieldsRes = await fetch(`${API_BASE}/fields/farm/${farm.id}`);
          const fieldsData = await fieldsRes.json();
          allFields = [...allFields, ...fieldsData.map(f => ({ ...f, farm_name: farm.farm_name }))];
        }
        setFields(allFields);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!growerName) {
      alert('Please fill in Grower Name');
      return;
    }

    try {
      const companiesRes = await fetch(`${API_BASE}/companies/`);
      const companies = await companiesRes.json();
      const kasCompany = companies.find(c => c.company_name === 'KAS Internal');
      
      if (!kasCompany) {
        alert('KAS Internal company not found. Please contact support.');
        return;
      }

      const payload = {
        company_id: kasCompany.id,
        grower_name: growerName,
        contact_person: contactPerson,
        email: email,
        phone: phone,
        address: address,
        city: city,
        state: state,
        zip: zip,
        notes: notes
      };

      if (grower) {
        const res = await fetch(`${API_BASE}/growers/${grower.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert('Client updated successfully!');
          onSave();
        } else {
          alert('Failed to update client');
        }
      } else {
        const res = await fetch(`${API_BASE}/growers/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert('Client added successfully!');
          onSave();
        } else {
          alert('Failed to add client');
        }
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddFarm = async () => {
    if (!newFarmName) {
      alert('Please enter a farm name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/farms/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grower_id: grower.id,
          farm_name: newFarmName,
          location: newFarmLocation,
          total_acres: newFarmAcres ? parseFloat(newFarmAcres) : null
        })
      });

      if (res.ok) {
        setNewFarmName('');
        setNewFarmLocation('');
        setNewFarmAcres('');
        setShowAddFarm(false);
        fetchInitialData();
      } else {
        alert('Failed to add farm');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteFarm = async (farmId) => {
    if (!window.confirm('Delete this farm? This will also delete all its fields.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/farms/${farmId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchInitialData();
      } else {
        alert('Failed to delete farm');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddField = async () => {
    if (!newFieldFarmId || !newFieldName) {
      alert('Please select a farm and enter a field name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/fields/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: parseInt(newFieldFarmId),
          field_name: newFieldName,
          acres: newFieldAcres ? parseFloat(newFieldAcres) : null,
          latitude: newFieldLat ? parseFloat(newFieldLat) : null,
          longitude: newFieldLong ? parseFloat(newFieldLong) : null
        })
      });

      if (res.ok) {
        setNewFieldFarmId('');
        setNewFieldName('');
        setNewFieldAcres('');
        setNewFieldLat('');
        setNewFieldLong('');
        setShowAddField(false);
        fetchInitialData();
      } else {
        alert('Failed to add field');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!window.confirm('Delete this field?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/fields/${fieldId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchInitialData();
      } else {
        alert('Failed to delete field');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${growerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/growers/${grower.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Client deleted successfully!');
        onSave();
      } else {
        alert('Failed to delete client');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto p-8">
        <h3 className="text-2xl font-bold mb-6">
          {grower ? `Edit ${grower.grower_name}` : 'Add New Client'}
        </h3>

        <div className="space-y-8">
          {/* Contact Information with ADDRESS */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-700">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grower/Operation Name *</label>
                <input
                  type="text"
                  value={growerName}
                  onChange={(e) => setGrowerName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter grower name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="ZIP code"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows="3"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </div>

          {/* Farms */}
          {grower && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-700">Farms ({farms.length})</h4>
                <button
                  onClick={() => setShowAddFarm(!showAddFarm)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Farm
                </button>
              </div>

              {showAddFarm && (
                <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newFarmName}
                      onChange={(e) => setNewFarmName(e.target.value)}
                      className="border rounded px-3 py-2"
                      placeholder="Farm name *"
                    />
                    <input
                      type="text"
                      value={newFarmLocation}
                      onChange={(e) => setNewFarmLocation(e.target.value)}
                      className="border rounded px-3 py-2"
                      placeholder="Location"
                    />
                    <input
                      type="number"
                      value={newFarmAcres}
                      onChange={(e) => setNewFarmAcres(e.target.value)}
                      className="border rounded px-3 py-2"
                      placeholder="Total acres"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddFarm}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Save Farm
                    </button>
                    <button
                      onClick={() => {
                        setShowAddFarm(false);
                        setNewFarmName('');
                        setNewFarmLocation('');
                        setNewFarmAcres('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {farms.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                  No farms added yet
                </div>
              ) : (
                <div className="space-y-2">
                  {farms.map(farm => (
                    <div key={farm.id} className="border rounded-lg p-4 bg-gray-50 flex justify-between items-start">
                      <div>
                        <div className="font-medium">{farm.farm_name}</div>
                        {farm.location && <div className="text-sm text-gray-600">{farm.location}</div>}
                        {farm.total_acres && <div className="text-sm text-gray-500">{farm.total_acres} acres</div>}
                      </div>
                      <button
                        onClick={() => handleDeleteFarm(farm.id)}
                        className="text-red-600 hover:text-red-700 ml-4"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fields - SIMPLIFIED */}
          {grower && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-700">Fields ({fields.length})</h4>
                <button
                  onClick={() => setShowAddField(!showAddField)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  disabled={farms.length === 0}
                >
                  <Plus size={16} />
                  Add Field
                </button>
              </div>

              {showAddField && (
                <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select
                      value={newFieldFarmId}
                      onChange={(e) => setNewFieldFarmId(e.target.value)}
                      className="border rounded px-3 py-2"
                    >
                      <option value="">Select farm *</option>
                      {farms.map(f => (
                        <option key={f.id} value={f.id}>{f.farm_name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="border rounded px-3 py-2"
                      placeholder="Field name *"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      value={newFieldAcres}
                      onChange={(e) => setNewFieldAcres(e.target.value)}
                      className="border rounded px-3 py-2"
                      placeholder="Acres"
                    />
                    <input
                      type="number"
                      step="0.000001"
                      value={newFieldLat}
                      onChange={(e) => setNewFieldLat(e.target.value)}
                      className="border rounded px-3 py-2"
                      placeholder="Latitude (optional)"
                    />
                    <input
                      type="number"
                      step="0.000001"
                      value={newFieldLong}
                      onChange={(e) => setNewFieldLong(e.target.value)}
                      className="border rounded px-3 py-2"
                      placeholder="Longitude (optional)"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddField}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Save Field
                    </button>
                    <button
                      onClick={() => {
                        setShowAddField(false);
                        setNewFieldFarmId('');
                        setNewFieldName('');
                        setNewFieldAcres('');
                        setNewFieldLat('');
                        setNewFieldLong('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {fields.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                  No fields added yet
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map(field => (
                    <div key={field.id} className="border rounded-lg p-3 bg-gray-50 flex justify-between items-center">
                      <div>
                        <span className="font-medium">{field.field_name}</span>
                        <span className="text-sm text-gray-600 ml-2">({field.farm_name})</span>
                        {field.acres && <span className="text-sm text-gray-500 ml-2">â€¢ {field.acres} ac</span>}
                        {(field.latitude || field.longitude) && (
                          <span className="text-xs text-gray-400 ml-2">â€¢ {field.latitude}, {field.longitude}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fertilizer Preferences */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-700">Fertilizer Preferences</h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Fertilizer preference management coming soon! This will allow you to set default N, P, K sources and application methods.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-8 border-t mt-8">
          {grower && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 size={18} />
              Delete Client
            </button>
          )}
          
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;