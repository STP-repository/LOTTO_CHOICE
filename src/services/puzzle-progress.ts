import {personalStorage} from './profiles';
type ProgressStorage=Pick<Storage,'getItem'|'setItem'>;
const valid=(stage:unknown):stage is string=>typeof stage==='string'&&/^[1-9]\d{0,39}$/.test(stage);
/** Migrate the stage number only. A previous board/action snapshot is deliberately never resumed. */
export function loadPuzzleStage(key:string,storage:ProgressStorage=personalStorage){try{const old=JSON.parse(storage.getItem(key)||'null'),stage=old?.stage??old?.puzzle?.stage;return valid(stage)?stage:'1';}catch{return '1';}}
export function savePuzzleStage(key:string,stage:string,version:string,storage:ProgressStorage=personalStorage){if(!valid(stage))return false;try{storage.setItem(key,JSON.stringify({stage,version}));return true;}catch{return false;}}
