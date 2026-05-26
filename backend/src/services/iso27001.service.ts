import { createIsoFrameworkService } from './isoFramework.base';

const isoService = createIsoFrameworkService({
  controlsTable: 'iso27001_controls',
  implementationsTable: 'iso27001_implementations',
  clausesTable: 'iso27001_clauses',
  featureId: 'iso27001'
});

export class Iso27001Service {
  static seedImplementations = isoService.seedImplementations;
  static getFrameworkOverview = isoService.getFrameworkOverview;
  static updateImplementation = isoService.updateImplementation;
  static syncComplianceSnapshot = isoService.syncComplianceSnapshot;
}
