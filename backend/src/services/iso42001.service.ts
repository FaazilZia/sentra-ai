import { createIsoFrameworkService } from './isoFramework.base';

const isoService = createIsoFrameworkService({
  controlsTable: 'iso42001_controls',
  implementationsTable: 'iso42001_implementations',
  clausesTable: 'iso42001_clauses',
  featureId: 'iso42001'
});

export class Iso42001Service {
  static seedImplementations = isoService.seedImplementations;
  static getFrameworkOverview = isoService.getFrameworkOverview;
  static updateImplementation = isoService.updateImplementation;
  static syncComplianceSnapshot = isoService.syncComplianceSnapshot;
}
