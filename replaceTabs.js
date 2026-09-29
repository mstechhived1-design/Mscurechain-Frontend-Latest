const fs = require('fs');
const path = require('path');

const filePath = '/Users/apple/newcure/Multitenant_MsCurechain_Frontend/app/[hospitalId]/(portals)/doctor/appointment/[appointmentId]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace Tabs
const tabsToReplace = `<div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-900 rounded-2xl border border-border-theme w-fit">
            <TabButton
              active={activeTab === 'consultation'}
              onClick={() => setActiveTab('consultation')}
              icon={<Stethoscope size={16} />}
              label="Consultation"
            />
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={<History size={16} />}
              label="Medical History"
            />
          </div>`;

const newTabs = `<div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-gray-900 rounded-2xl border border-border-theme w-fit">
            <TabButton
              active={activeTab === 'clinical-notes'}
              onClick={() => setActiveTab('clinical-notes')}
              icon={<FileText size={16} />}
              label="Clinical Notes"
            />
            <TabButton
              active={activeTab === 'smart-prescription'}
              onClick={() => setActiveTab('smart-prescription')}
              icon={<Stethoscope size={16} />}
              label="Smart Prescription"
            />
            <TabButton
              active={activeTab === 'labs'}
              onClick={() => setActiveTab('labs')}
              icon={<Beaker size={16} />}
              label="Lab Orders"
            />
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={<History size={16} />}
              label="Medical History"
            />
          </div>`;

content = content.replace(tabsToReplace, newTabs);

// Replace activeTab check
const activeTabCheck = `{activeTab === 'consultation' ? (`;

const newActiveTabCheck = `{activeTab === 'clinical-notes' && (
            <div className="space-y-6">
              <ClinicalNotesEditor 
                initialData={{
                  chiefComplaints: clinicalNotes || appointment?.clinicalNotes || '',
                  assessment: diagnosis || appointment?.diagnosis || '',
                  plan: plan || appointment?.plan || ''
                }}
                onSave={async (data) => {
                  setClinicalNotes(data.chiefComplaints);
                  setDiagnosis(data.assessment);
                  setPlan(data.plan);
                  try {
                    await doctorService.saveConsultationDraft(appointmentId, {
                      clinicalNotes: data.chiefComplaints,
                      diagnosis: data.assessment,
                      plan: data.plan
                    });
                  } catch (error) {
                    console.error("Save failed", error);
                  }
                }}
              />
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => handleEndConsultation(false)}
                  className="px-6 py-3 bg-primary-theme text-white rounded-xl font-bold shadow-lg shadow-primary-theme/20 hover:scale-105 transition-all"
                >
                  Save & Complete Consultation
                </button>
              </div>
            </div>
          )}

          {activeTab === 'smart-prescription' && (
            <div className="space-y-6">
              <SmartPrescriptionCard 
                hospitalId={(user as any)?.hospitalId || ''}
                appointmentId={appointmentId}
                patientId={appointment?.patient?._id || ''}
                patientAllergies={appointment?.patient?.allergies}
                onSuccess={() => {
                  setActiveTab('history');
                  setHistorySubTab('prescriptions');
                  fetchPatientHistory();
                }}
              />
            </div>
          )}

          {activeTab === 'labs' && (`;

content = content.replace(activeTabCheck, newActiveTabCheck);

// Remove the old Clinical Notes UI and fix the ending braces
const oldClinicalNotesStart = `              {/* Clinical Notes & Diagnosis Editor */}`;
const oldClinicalNotesEnd = `          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* History Scoping Toggle & Filters */}`;

const startIndex = content.indexOf(oldClinicalNotesStart);
const endIndex = content.indexOf(oldClinicalNotesEnd);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + `          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* History Scoping Toggle & Filters */}` + content.substring(endIndex + oldClinicalNotesEnd.length);
}

// Fix the bottom of the history block from `          )}` to `          )}` which is already fine, 
// wait, the original bottom had `          ) : null}` or `          )}`.
// Let's replace `            </div>\n          )}\n        </div>\n      </main>`
// Wait, since we changed `? (` to `&& (`, the original `) : (` became `)} \n {activeTab === 'history' && (` which is correct.
// We just need to make sure the final `}` for the else block doesn't exist.
const bottomToReplace = `              </div>
            </div>
          )}
        </div>
      </main>`;
// Actually, it was just an if statement originally, so there's no dangling else block at the end if we just change the ternary to &&.
// Let's check how the ternary originally ended.
// The history block was the `else` block of `activeTab === 'consultation' ? (...) : (...)`.
// So it ended with `          )}\n        </div>\n      </main>`. Wait, `)` closes the `(`, and `}` closes the JSX block? No, it's just `)}`.
// So `)` is fine.

fs.writeFileSync(filePath, content, 'utf8');
console.log('File updated successfully.');
