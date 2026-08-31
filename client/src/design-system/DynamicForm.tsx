import React, { useState } from 'react';

export interface FormFieldDef {
  name: string;
  label: string;
  labelAm: string;
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'single_select' | 'multi_select' | 'attachment';
  isRequired?: boolean;
  options?: string[];
  validationRule?: string;
  placeholder?: string;
  placeholderAm?: string;
}

export interface DynamicFormProps {
  fields: FormFieldDef[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  lang?: 'en' | 'am';
  submitLabel?: string;
  isSubmitting?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  initialValues = {},
  onSubmit,
  lang = 'en',
  submitLabel,
  isSubmitting = false,
}) => {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...initialValues };
    fields.forEach((f) => {
      if (initial[f.name] === undefined) {
        if (f.dataType === 'boolean') initial[f.name] = false;
        else if (f.dataType === 'multi_select') initial[f.name] = [];
        else initial[f.name] = '';
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: FormFieldDef, val: any): string | null => {
    const isAm = lang === 'am';
    const label = isAm ? field.labelAm || field.label : field.label;

    if (field.isRequired) {
      if (val === undefined || val === null || val === '') {
        return isAm ? `${label} መሞላት አለበት` : `${label} is required`;
      }
      if (field.dataType === 'multi_select' && Array.isArray(val) && val.length === 0) {
        return isAm ? `ቢያንስ አንድ ${label} ይምረጡ` : `Select at least one ${label}`;
      }
    }

    if (val === undefined || val === null || val === '') {
      return null;
    }

    switch (field.dataType) {
      case 'text':
        if (field.validationRule) {
          try {
            const regex = new RegExp(field.validationRule);
            if (!regex.test(val)) {
              return isAm ? `ትክክለኛ ቅርጸት አይደለም` : `Does not match pattern (${field.validationRule})`;
            }
          } catch {
            // ignore bad regex
          }
        }
        break;

      case 'number': {
        const num = Number(val);
        if (isNaN(num)) {
          return isAm ? `ትክክለኛ ቁጥር ያስገቡ` : `Must be a valid number`;
        }
        break;
      }

      case 'date': {
        if (isNaN(Date.parse(val))) {
          return isAm ? `ትክክለኛ ቀን ያስገቡ` : `Must be a valid date`;
        }
        break;
      }

      case 'single_select': {
        if (field.options && !field.options.includes(val)) {
          return isAm ? `ከተፈቀዱት ምርጫዎች አንዱን ይምረጡ` : `Must be one of: ${field.options.join(', ')}`;
        }
        break;
      }

      case 'multi_select': {
        if (Array.isArray(val) && field.options) {
          const invalid = val.filter((item) => !field.options!.includes(item));
          if (invalid.length > 0) {
            return isAm ? `ልክ ያልሆነ ምርጫ` : `Invalid selection: ${invalid.join(', ')}`;
          }
        }
        break;
      }

      case 'attachment': {
        if (typeof val !== 'object' || (!val.url && typeof val !== 'string')) {
          return isAm ? `ትክክለኛ አባሪ ያስገቡ` : `Must be a valid attachment URL`;
        }
        break;
      }
    }

    return null;
  };

  const handleChange = (name: string, val: any) => {
    setValues((prev) => ({ ...prev, [name]: val }));
    // Clear error for field
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const err = validateField(field, values[field.name]);
      if (err) {
        newErrors[field.name] = err;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {fields.map((field) => {
        const isAm = lang === 'am';
        const label = isAm ? field.labelAm || field.label : field.label;
        const placeholder = isAm ? field.placeholderAm || field.placeholder : field.placeholder;
        const err = errors[field.name];

        return (
          <div key={field.name} className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
              <span>
                {label}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>

            {field.dataType === 'text' && (
              <input
                type="text"
                value={values[field.name] ?? ''}
                placeholder={placeholder}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-sm ${
                  err ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
            )}

            {field.dataType === 'number' && (
              <input
                type="number"
                value={values[field.name] ?? ''}
                placeholder={placeholder}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-sm ${
                  err ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
            )}

            {field.dataType === 'date' && (
              <input
                type="date"
                value={values[field.name] ? String(values[field.name]).split('T')[0] : ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-sm ${
                  err ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
            )}

            {field.dataType === 'boolean' && (
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id={`field-${field.name}`}
                  checked={Boolean(values[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  className="h-4 w-4 text-[#D4A373] focus:ring-[#D4A373] border-gray-300 rounded"
                />
                <label htmlFor={`field-${field.name}`} className="text-sm text-gray-600 select-none">
                  {isAm ? 'አዎ / ነቅቷል' : 'Yes / Active'}
                </label>
              </div>
            )}

            {field.dataType === 'single_select' && (
              <select
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-sm ${
                  err ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">{isAm ? '-- ይምረጡ --' : '-- Select --'}</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {field.dataType === 'multi_select' && (
              <div className="space-y-1 pt-1 border border-gray-200 rounded p-2 bg-gray-50">
                {field.options?.map((opt) => {
                  const selected: string[] = Array.isArray(values[field.name]) ? values[field.name] : [];
                  const isChecked = selected.includes(opt);
                  return (
                    <label key={opt} className="flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleChange(field.name, [...selected, opt]);
                          } else {
                            handleChange(
                              field.name,
                              selected.filter((item) => item !== opt),
                            );
                          }
                        }}
                        className="h-4 w-4 text-[#D4A373] focus:ring-[#D4A373] border-gray-300 rounded"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {field.dataType === 'attachment' && (
              <input
                type="text"
                placeholder={isAm ? 'የፋይል ወይም ዶክመንት URL' : 'Document or attachment URL'}
                value={typeof values[field.name] === 'object' ? values[field.name]?.url ?? '' : values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, { url: e.target.value })}
                className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-sm ${
                  err ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
            )}

            {err && <p className="text-xs text-red-600 mt-1 font-medium">{err}</p>}
          </div>
        );
      })}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#D4A373] hover:bg-[#A07855] text-white font-medium py-2 px-4 rounded-md shadow transition-colors disabled:opacity-50 text-sm"
        >
          {submitLabel || (lang === 'am' ? 'አስቀምጥ' : 'Save')}
        </button>
      </div>
    </form>
  );
};
