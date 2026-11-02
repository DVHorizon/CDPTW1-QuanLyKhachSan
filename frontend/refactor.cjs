const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/MenuManagement.jsx', 'utf8');

// Add imports at the top
content = content.replace("import AdminLayout from '../../components/admin/layout/AdminLayout';", "import AdminLayout from '../../../components/admin/layout/AdminLayout';\nimport MenuForm from './MenuForm';\nimport MenuDetails from './MenuDetails';");

// Replace Form
const formRegex = /\/\* FORM VIEW \*\/[\s\S]*?(?=\s*\) : activeRow)/;
const replacementForm = `/* FORM VIEW */
                <MenuForm
                  isEditing={!!editingItem}
                  formData={formData}
                  setFormData={setFormData}
                  handleSave={handleSave}
                  onCancel={() => setIsModalOpen(false)}
                />`;
content = content.replace(formRegex, replacementForm);

// Replace Details
const detailsRegex = /\/\* DETAILS VIEW \*\/[\s\S]*?(?=\s*\) : \(\s*\/\* EMPTY PLACEHOLDER \*\/)/;
const replacementDetails = `/* DETAILS VIEW */
                <div className="flex flex-col h-full justify-between">
                  <MenuDetails
                    item={menuItems.find(m => m.id === activeRow)}
                    onEdit={openEditModal}
                    onDelete={(id) => setConfirmModal({ isOpen: true, itemId: id })}
                  />
                </div>`;
content = content.replace(detailsRegex, replacementDetails);

fs.writeFileSync('src/pages/admin/menu/MenuManagement.jsx', content, 'utf8');
