import { createReducer,on } from '@ngrx/store';
import { initialConfigState } from './config.state';
import * as ConfigActions from './config.actions.ngrx';

export const configReducer = createReducer(
  initialConfigState,
  on(ConfigActions.getConfig, state => state),
  on(ConfigActions.updateConfig, (state, { config }) => ({
    ...state,
    ...config
  }))
);