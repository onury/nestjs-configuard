export type {
  IAccessorInfo,
  IConfigItem,
  IConfiguardOptions,
  ISaveResult,
  ISerializeOptions
} from 'configuard';
// Re-export configuard essentials so apps need a single import.
export {
  AccessorType,
  Configuard,
  ConfiguardError,
  ListType,
  ValueType
} from 'configuard';
export { ConfiguardModule } from './configuard.module';
export { ConfiguardService } from './configuard.service';
export { CONFIGUARD, InjectConfiguard } from './tokens';
export type {
  ConfiguardFactoryResult,
  ConfiguardModuleAsyncOptions,
  ConfiguardModuleOptions
} from './types';
