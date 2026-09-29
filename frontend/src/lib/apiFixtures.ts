/**
 * Offline Mock Fixtures for Chakshu API Client (PRD 5 §8).
 */

import aoiFixture from '../fixtures/aoi.json';
import scenesFixture from '../fixtures/scenes.json';
import changeSummaryFixture from '../fixtures/change_summary.json';
import evidenceSingleFixture from '../fixtures/evidence_single.json';
import evidenceListFixture from '../fixtures/evidence_list.json';
import uploadGeoreferencedFixture from '../fixtures/upload_georeferenced.json';
import uploadVisualOnlyFixture from '../fixtures/upload_visual_only.json';
import uploadUnknownGsdFixture from '../fixtures/upload_unknown_gsd.json';
import suppressionFixture from '../fixtures/suppression.json';
import traceFixture from '../fixtures/trace.json';
import calibrationFixture from '../fixtures/calibration.json';
import answerPolishedFixture from '../fixtures/answer_polished.json';
import answerUnsupportedFixture from '../fixtures/answer_unsupported.json';

export const fixtures = {
  aoi: aoiFixture,
  scenes: scenesFixture,
  changeSummary: changeSummaryFixture,
  evidenceSingle: evidenceSingleFixture,
  evidenceList: evidenceListFixture,
  uploadGeoreferenced: uploadGeoreferencedFixture,
  uploadVisualOnly: uploadVisualOnlyFixture,
  uploadUnknownGsd: uploadUnknownGsdFixture,
  suppression: suppressionFixture,
  trace: traceFixture,
  calibration: calibrationFixture,
  answerPolished: answerPolishedFixture,
  answerUnsupported: answerUnsupportedFixture,
};
