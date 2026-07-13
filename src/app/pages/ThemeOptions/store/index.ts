// This file is deprecated - NgRx state management is now handled in:
// - config.state.ts (state interfaces)
// - config.reducer.ngrx.ts (reducers)
// - config.actions.ngrx.ts (actions)
// - config.service.ts (service layer)

// Re-export for backwards compatibility
export { configReducer } from './config.reducer';
export type { ConfigState } from './config.state';


