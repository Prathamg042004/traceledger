import {restoreWorkspace} from '../insights.mjs';

export function cloudSnapshot(document) {
 const [safe]=restoreWorkspace(JSON.stringify({format:'traceledger-workspace',version:1,documents:[document]}));
 const {cloudRef,...snapshot}=safe;
 // Browser history and approval claims are not authenticated shared events.
 return {...snapshot,audit:[]};
}
export function editSharedCopy(record) {
 const snapshot=cloudSnapshot(record.snapshot);
 return {...snapshot,id:crypto.randomUUID(),cloudRef:{workspaceId:record.workspace_id,recordId:record.id,sourceKey:record.source_key,version:record.version},audit:[{time:new Date().toISOString(),action:`Loaded shared revision ${record.version}; local review reset`} ]};
}
export function saveIdentity(document,workspaceId) {
 const ref=document.cloudRef?.workspaceId===workspaceId?document.cloudRef:null;
 return {sourceKey:ref?.sourceKey||document.id,expectedVersion:ref?.version||0};
}
