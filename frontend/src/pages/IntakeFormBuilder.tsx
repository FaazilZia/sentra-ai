import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Settings2, 
  CheckSquare, 
  AlignLeft, 
  ChevronDown, 
  Eye, 
  RefreshCw, 
  ClipboardList,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface IntakeFormConfig {
  id?: string;
  title: string;
  description: string;
  fields: FormField[];
  isActive: boolean;
}

interface DraggablePaletteItemProps {
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  description: string;
  icon: React.ReactNode;
  onAdd: (type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio') => void;
}

function DraggablePaletteItem({ type, label, description, icon, onAdd }: DraggablePaletteItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: type,
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(type)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onAdd(type))}
      role="button"
      tabIndex={0}
      className={cn(
        "flex items-center gap-3 p-3 bg-white border border-[var(--border-default)] hover:border-[var(--border-default)] hover:bg-[var(--bg-page)] rounded-xl transition text-left cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-50 border-[var(--royal-indigo)] z-50"
      )}
    >
      {icon}
      <div>
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="text-[9px] text-[var(--text-muted)] uppercase">{description}</p>
      </div>
    </div>
  );
}

interface DroppableCanvasProps {
  id: string;
  children: React.ReactNode;
  isOverClassName?: string;
}

function DroppableCanvas({ id, children, isOverClassName }: DroppableCanvasProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full max-w-xl space-y-6 rounded-2xl p-4 transition-all",
        isOver && (isOverClassName || "bg-indigo-600/5 border border-dashed border-indigo-500/50 scale-[1.01]")
      )}
    >
      {children}
    </div>
  );
}

export default function IntakeFormBuilder() {
  const { formId } = useParams<{ formId?: string }>();
  const navigate = useNavigate();
  const { addToast } = useStore();

  // Builder States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingForms, setExistingForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);

  const [formConfig, setFormConfig] = useState<IntakeFormConfig>({
    title: 'New AI Intake Questionnaire',
    description: 'Provide information regarding the proposed AI system deployment.',
    fields: [
      { id: 'f-1', type: 'text', name: 'department', label: 'Department / Team', placeholder: 'e.g. Security Operations', required: true },
      { id: 'f-2', type: 'select', name: 'dataAccess', label: 'Types of Data Accessed', required: true, options: ['PII', 'Financial Data', 'Intellectual Property', 'Public Information'] },
      { id: 'f-3', type: 'textarea', name: 'externalIntegrations', label: 'External API Integrations', placeholder: 'List all third-party APIs used...', required: false }
    ],
    isActive: true
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const selectedField = formConfig.fields.find(f => f.id === selectedFieldId);

  // Load existing forms list
  const loadFormsList = useCallback(async () => {
    setLoadingForms(true);
    try {
      const res = await apiRequest<any[]>('/intake-forms');
      setExistingForms(res || []);
    } catch (err: any) {
      console.error('Failed to load forms list', err);
    } finally {
      setLoadingForms(false);
    }
  }, []);

  // Load active form if editing
  const loadForm = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(`/intake-forms/${id}`);
      if (res) {
        setFormConfig({
          id: res.id,
          title: res.title || 'Untitled Form',
          description: res.description || '',
          fields: Array.isArray(res.fields) ? res.fields : [],
          isActive: res.isActive !== undefined ? res.isActive : true
        });
        setSelectedFieldId(null);
      }
    } catch (err: any) {
      addToast({ message: `Failed to load form builder config: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadFormsList();
    if (formId) {
      loadForm(formId);
    }
  }, [formId, loadForm, loadFormsList]);

  // Add field to Canvas
  const addField = (type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio') => {
    const id = `f-${Date.now()}`;
    const name = `field_${formConfig.fields.length + 1}`;
    
    const newField: FormField = {
      id,
      type,
      name,
      label: `New ${type.toUpperCase()} Question`,
      required: false,
      placeholder: type === 'text' || type === 'textarea' ? 'Enter your response...' : undefined,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined
    };

    setFormConfig(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedFieldId(id);
    addToast({ message: `Added ${type} field`, type: 'success' });
  };

  // Update Field property
  const updateFieldProperty = (id: string, prop: keyof FormField, value: any) => {
    setFormConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === id) {
          return { ...f, [prop]: value };
        }
        return f;
      })
    }));
  };

  // Reordering fields
  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formConfig.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    // Swap elements
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    setFormConfig(prev => ({ ...prev, fields: newFields }));
  };

  // Delete field from Canvas
  const deleteField = (id: string) => {
    setFormConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id)
    }));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
    addToast({ message: 'Deleted field', type: 'info' });
  };

  // Option additions
  const addOption = (id: string, optionText: string) => {
    if (!optionText.trim()) return;
    const field = formConfig.fields.find(f => f.id === id);
    if (!field) return;

    const currentOptions = field.options || [];
    if (currentOptions.includes(optionText.trim())) {
      addToast({ message: 'Option already exists', type: 'warning' });
      return;
    }

    updateFieldProperty(id, 'options', [...currentOptions, optionText.trim()]);
  };

  const removeOption = (id: string, optionIndex: number) => {
    const field = formConfig.fields.find(f => f.id === id);
    if (!field) return;

    const currentOptions = field.options || [];
    updateFieldProperty(id, 'options', currentOptions.filter((_, i) => i !== optionIndex));
  };

  // Drag End handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && over.id === 'canvas-zone') {
      const fieldType = active.id as 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
      addField(fieldType);
    }
  };

  // Save Config to Server
  const saveFormConfig = async (publish: boolean) => {
    if (!formConfig.title.trim()) {
      addToast({ message: 'Form title is required', type: 'warning' });
      return;
    }
    if (formConfig.fields.length === 0) {
      addToast({ message: 'Add at least one question to the form', type: 'warning' });
      return;
    }

    setSaving(true);
    const updatedConfig = {
      ...formConfig,
      isActive: publish
    };

    try {
      if (formConfig.id) {
        // Update
        await apiRequest(`/intake-forms/${formConfig.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatedConfig)
        });
        if (publish) {
          addToast({ message: 'Form published successfully', type: 'success' });
        } else {
          addToast({ message: 'Form draft saved successfully', type: 'success' });
        }
      } else {
        // Create new
        const created = await apiRequest<any>('/intake-forms', {
          method: 'POST',
          body: JSON.stringify(updatedConfig)
        });
        if (publish) {
          addToast({ message: 'Form published successfully', type: 'success' });
        } else {
          addToast({ message: 'Form draft created', type: 'success' });
        }
        if (created?.id) {
          navigate(`/app/intake/builder/${created.id}`);
        }
      }
      setFormConfig(prev => ({ ...prev, isActive: publish }));
      loadFormsList();
    } catch (err: any) {
      addToast({ message: `Failed to save form config: ${err.message || 'Server error'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const createNewTemplate = () => {
    setFormConfig({
      title: 'AI Intake Form Custom Template',
      description: 'Submit technical specs for AI registry audit reviews.',
      fields: [],
      isActive: true
    });
    setSelectedFieldId(null);
    navigate('/app/intake/builder');
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-[var(--bg-page)] text-[var(--text-secondary)] font-sans overflow-hidden">
        {/* Top action header */}
        <div className="p-4 bg-white border-b border-[var(--border-default)] flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--mid-indigo)]/20 border border-[var(--royal-indigo)]/30 rounded-lg">
              <ClipboardList className="h-5 w-5 text-[var(--royal-indigo)]" />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">Intake Form Builder</h1>
              <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Design questionnaire schemas for safety audits</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-all active:scale-95"
            >
              <Eye className="h-3.5 w-3.5 text-indigo-400" />
              {previewMode ? 'Edit Design' : 'Form Preview'}
            </button>
            
            <button
              onClick={() => saveFormConfig(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-50 rounded text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Draft
            </button>

            <button
              onClick={() => saveFormConfig(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--mid-indigo)] hover:bg-[var(--royal-indigo)] disabled:opacity-50 text-white rounded text-[10px] font-semibold uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-indigo-500/10"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Publish
            </button>
            
            <button
              onClick={() => navigate('/app/intake')}
              className="px-3 py-2 bg-white hover:bg-white border border-[var(--border-default)] rounded text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-all"
            >
              Back to Queue
            </button>
          </div>
        </div>

      {/* Main Builder layout */}
      {previewMode ? (
        // Preview Pane
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-white/10">
          <div className="w-full max-w-2xl bg-white/50 border border-[var(--border-default)]/80 rounded-2xl p-6 space-y-6 text-left">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-tight">{formConfig.title}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{formConfig.description}</p>
            </div>
            
            <div className="space-y-4">
              {formConfig.fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      disabled
                      className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] w-full"
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      placeholder={field.placeholder}
                      rows={3}
                      disabled
                      className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] w-full"
                    />
                  )}

                  {field.type === 'select' && (
                    <div className="relative">
                      <select disabled className="bg-black/30 border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-secondary)] w-full appearance-none">
                        <option>Choose option...</option>
                        {field.options?.map((opt, i) => (
                          <option key={i}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                  )}

                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2 mt-1 cursor-pointer">
                      <input type="checkbox" disabled className="rounded border-[var(--border-default)] bg-black/30 text-indigo-600 focus:ring-0 focus:ring-offset-0" />
                      <span className="text-xs text-[var(--text-secondary)]">Acknowledge agreement</span>
                    </label>
                  )}

                  {field.type === 'radio' && (
                    <div className="space-y-1.5 mt-1">
                      {field.options?.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" disabled name={field.id} className="border-[var(--border-default)] bg-black/30 text-indigo-600 focus:ring-0 focus:ring-offset-0" />
                          <span className="text-xs text-[var(--text-secondary)]">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Columns: 1. Templates selector / list. 2. Canvas. 3. Property Editor
        <div className="flex-1 flex overflow-hidden">
          
          {/* Column 1: Palette & Template List */}
          <div className="w-72 bg-white border-r border-[var(--border-default)] flex flex-col overflow-y-auto">
            {/* Template picker */}
            <div className="p-4 border-b border-[var(--border-default)]/60 bg-[#09090e]/40">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] block mb-3">
                Intake Questionnaire Configs
              </span>
              
              {loadingForms ? (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">Loading forms...</div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {existingForms.map((ef) => (
                    <button
                      key={ef.id}
                      onClick={() => navigate(`/app/intake/builder/${ef.id}`)}
                      className={cn(
                        "w-full text-left p-2 rounded text-[11px] font-bold truncate transition",
                        formConfig.id === ef.id 
                          ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                          : "bg-white border border-[var(--border-default)] hover:border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {ef.title} {ef.isActive && <span className="text-[8px] text-emerald-500 uppercase ml-1.5">(Active)</span>}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={createNewTemplate}
                className="w-full flex items-center justify-center gap-1.5 mt-3 py-1.5 bg-white border border-[var(--border-default)] rounded text-[9px] font-semibold uppercase tracking-widest hover:bg-[var(--bg-hover)] transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-400" />
                Create New Template
              </button>
            </div>

            {/* Draggable/Clickable Palette Items */}
            <div className="p-4 space-y-4">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] block">
                Fields Palette
              </span>

              <div className="grid grid-cols-1 gap-2">
                <DraggablePaletteItem
                  type="text"
                  label="Text Input"
                  description="Single line input field"
                  icon={<AlignLeft className="h-4 w-4 text-sky-400" />}
                  onAdd={addField}
                />

                <DraggablePaletteItem
                  type="textarea"
                  label="Text Area"
                  description="Multi-line text input"
                  icon={<AlignLeft className="h-4 w-4 text-purple-400" />}
                  onAdd={addField}
                />

                <DraggablePaletteItem
                  type="select"
                  label="Dropdown Select"
                  description="Choice list selection menu"
                  icon={<ChevronDown className="h-4 w-4 text-amber-400" />}
                  onAdd={addField}
                />

                <DraggablePaletteItem
                  type="checkbox"
                  label="Checkbox"
                  description="Acceptance indicator state"
                  icon={<CheckSquare className="h-4 w-4 text-emerald-400" />}
                  onAdd={addField}
                />

                <DraggablePaletteItem
                  type="radio"
                  label="Radio Group"
                  description="Exclusive toggle list"
                  icon={<CheckSquare className="h-4 w-4 text-rose-400" />}
                  onAdd={addField}
                />
              </div>
            </div>
          </div>

          {/* Column 2: Form Canvas */}
          <div className="flex-1 bg-white/10 overflow-y-auto p-6 flex justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Loading form builder...</span>
              </div>
            ) : (
              <DroppableCanvas id="canvas-zone">
                {/* Form Metadata Card */}
                <div className="card-base p-5 bg-[var(--bg-page)] border-[var(--border-default)]">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] block mb-3">
                    Form Schema Info
                  </span>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Form Title</label>
                      <input
                        type="text"
                        value={formConfig.title}
                        onChange={(e) => setFormConfig(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-black/30 border border-[var(--border-default)] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Description</label>
                      <textarea
                        value={formConfig.description}
                        onChange={(e) => setFormConfig(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="bg-black/30 border border-[var(--border-default)] rounded px-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-3">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Set Active Form</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formConfig.isActive}
                          onChange={(e) => setFormConfig(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[var(--bg-hover)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Canvas Form Fields */}
                <div className="space-y-3">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] block">
                    Form Design Canvas
                  </span>

                  {formConfig.fields.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-[var(--border-default)] rounded-xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                      <AlertTriangle className="h-6 w-6" />
                      <span className="text-xs italic">Questionnaire canvas is empty. Add fields from palette.</span>
                    </div>
                  ) : (
                    formConfig.fields.map((field, index) => {
                      const isSelected = selectedFieldId === field.id;
                      return (
                        <div
                          key={field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelectedFieldId(field.id))}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select field ${field.label}`}
                          className={cn(
                            "p-4 rounded-xl border transition-all text-left flex justify-between items-start cursor-pointer select-none",
                            isSelected 
                              ? "bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-500/5" 
                              : "bg-white border-[var(--border-default)]/80 hover:border-[var(--border-default)]"
                          )}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-semibold uppercase text-indigo-400 tracking-wide bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                {field.type}
                              </span>
                              <span className="text-xs font-bold text-white truncate">{field.label}</span>
                              {field.required && <span className="text-red-500 text-xs font-bold">*</span>}
                            </div>
                            
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">key: {field.name}</p>
                            
                            {field.options && field.options.length > 0 && (
                              <p className="text-[9px] text-[var(--text-muted)] truncate mt-1">
                                Options: {field.options.join(' | ')}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-1 items-center shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                              disabled={index === 0}
                              className="p-1 hover:bg-[var(--bg-hover)] disabled:opacity-20 text-[var(--text-secondary)] rounded"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                              disabled={index === formConfig.fields.length - 1}
                              className="p-1 hover:bg-[var(--bg-hover)] disabled:opacity-20 text-[var(--text-secondary)] rounded"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                              className="p-1 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </DroppableCanvas>
            )}
          </div>

          {/* Column 3: Property Editor */}
          <div className="w-80 bg-white border-l border-[var(--border-default)] flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-[var(--border-default)] bg-[#09090e]/40 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                Properties Editor
              </span>
            </div>

            {selectedField ? (
              <div className="p-5 space-y-5 text-left">
                {/* Field type info badge */}
                <div>
                  <span className="text-[8px] font-semibold text-[var(--text-muted)] uppercase block mb-1">Field Type</span>
                  <span className="text-[9px] font-bold text-white uppercase bg-[var(--bg-hover)] border border-[var(--border-default)] px-2 py-0.5 rounded">
                    {selectedField.type} Question
                  </span>
                </div>

                {/* Field Label */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Question Label / Title</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateFieldProperty(selectedField.id, 'label', e.target.value)}
                    className="bg-black/30 border border-[var(--border-default)] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                {/* Field Name / API key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Field Key (snake_case)</label>
                  <input
                    type="text"
                    value={selectedField.name}
                    onChange={(e) => updateFieldProperty(selectedField.id, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className="bg-black/30 border border-[var(--border-default)] rounded px-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[8px] text-[var(--text-muted)]">Must be a unique programmatic identifier.</p>
                </div>

                {/* Field Placeholder (if input/textarea) */}
                {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Placeholder Text</label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => updateFieldProperty(selectedField.id, 'placeholder', e.target.value)}
                      className="bg-black/30 border border-[var(--border-default)] rounded px-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-3">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Required Question</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(e) => updateFieldProperty(selectedField.id, 'required', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[var(--bg-hover)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Options list editor (if dropdown/radio) */}
                {(selectedField.type === 'select' || selectedField.type === 'radio') && (
                  <div className="border-t border-[var(--border-default)]/60 pt-4 space-y-3">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] block">
                      Selection Options
                    </span>
                    
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        const opt = data.get('optionText') as string;
                        addOption(selectedField.id, opt);
                        e.currentTarget.reset();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="optionText"
                        type="text"
                        placeholder="Add new option..."
                        className="bg-black/30 border border-[var(--border-default)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 flex-1"
                      />
                      <button
                        type="submit"
                        className="p-1.5 bg-white hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded text-indigo-400"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </form>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {(selectedField.options || []).map((opt, i) => (
                        <div key={i} className="flex justify-between items-center bg-white border border-[var(--border-default)]/60 p-2 rounded">
                          <span className="text-xs text-[var(--text-secondary)] font-bold">{opt}</span>
                          <button
                            onClick={() => removeOption(selectedField.id, i)}
                            className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-[var(--text-muted)] text-xs italic">
                Select a field from the design canvas to configure properties.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
    </DndContext>
  );
}
