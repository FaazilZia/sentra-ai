import * as controller from '../controllers/iso42001.controller';
import { createIsoFrameworkRouter } from './frameworkRouteFactory';

export default createIsoFrameworkRouter(controller);
