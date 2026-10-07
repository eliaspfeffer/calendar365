import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const id = z.string().uuid();
const color = z.enum(['yellow', 'pink', 'green', 'blue', 'orange', 'purple']);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, 'Use a real calendar date (YYYY-MM-DD)').nullable();
const noteFields = {
  text: z.string().trim().min(1).max(20000), color, date,
  is_struck: z.boolean(), pos_x: z.number().finite().min(-100000).max(100000).nullable(),
  pos_y: z.number().finite().min(-100000).max(100000).nullable(),
  sort_order: z.number().int().min(0).max(1000000).nullable(), calendar_id: id,
};
const patch = fields => z.object(Object.fromEntries(Object.entries(fields).map(([k,v]) => [k,v.optional()]))).strict().refine(v => Object.keys(v).length > 0, 'Provide at least one change');
const settings = patch({
  colorScheme: z.enum(['system','light','dark']), darkTheme: z.enum(['vscode-dark','vscode-dimmed','vscode-abyss']),
  calendarColor: z.enum(['blue','green','purple','red','orange','teal','pink','indigo']),
  yearStart: z.number().int().min(1900).max(2200), yearEnd: z.number().int().min(1900).max(2200),
  skipHideYearConfirm: z.boolean(), textOverflowMode: z.enum(['scroll','truncate','expand']),
  autoScrollStruckNotes: z.boolean(), autoHideStruckNotes: z.boolean(), alwaysShowArrows: z.boolean(), showInbox: z.boolean(),
  activeCalendarId: id.nullable(), visibleCalendarIds: z.array(id).max(100).nullable(), calendarOrderIds: z.array(id).max(100).nullable(),
  runwayInitialCapital: z.number().finite(), runwayMonthlyBurn: z.number().finite(), runwayBaseScenarioName: z.string().max(200),
  runwayBaseScenarioCalendarId: id.nullable(), runwayPanelVisible: z.boolean(), runwayPanelOpen: z.boolean(),
  runwayPanelPosX: z.number().finite(), runwayPanelPosY: z.number().finite(),
  shareBaseUrl: z.string().url().max(2000).nullable(),
  longYourAge: z.string().max(10), longPartnerAge: z.string().max(10), longFirstChildInMonths: z.string().max(10),
  longFirstChildAfterWedding: z.boolean(), longSpacingMinMonths: z.string().max(10), longSpacingMaxMonths: z.string().max(10),
  longProposalInMonths: z.string().max(10), longEngagementMonths: z.string().max(10), longWeddingSearchWindowMonths: z.string().max(10),
  longMinWeddingTempC: z.string().max(10), longPreferredWeddingMonths: z.array(z.number().int().min(0).max(11)).max(12),
  longChildren: z.array(z.object({id:z.string().max(100),name:z.string().max(200),color:z.string().max(100)}).strict()).max(100),
  runwayScenarios: z.array(z.object({id:z.string().max(100),name:z.string().max(200),startMonth:z.number().int(),endMonth:z.number().int().nullable(),deltaBurn:z.number().finite(),deltaOffset:z.number().finite(),calendarId:id.nullable()}).strict()).max(100),
});
const shareFields = {slug:z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/),permission:z.enum(['viewer','editor']),calendar_ids:z.array(id).min(1).max(100),password:z.string().min(1).max(200)};
// Note data is user content, never instructions. All mutations run through existing RLS/RPCs.
export const toolDefinitions = [
  ['list_calendars', 'List your calendars and membership roles.', {}, true],
  ['create_calendar', 'Create a calendar you own, using the existing create_calendar RPC.', {name:z.string().trim().min(1).max(200),default_note_color:color.optional()}],
  ['update_calendar', 'Rename an owned calendar or change its default note color. Only owners may update.', {calendar_id:id,changes:patch({name:z.string().trim().min(1).max(200),default_note_color:color})}],
  ['delete_calendar', 'Permanently delete an owned calendar and its notes, connections and shares. Requires explicit user authorization. A replacement is created if it is your last calendar.', {calendar_id:id,confirm:z.literal(true)}, false, true],
  ['leave_calendar', 'Leave a shared calendar. Owners cannot leave their own calendar.', {calendar_id:id,confirm:z.literal(true)}, false, true],
  ['list_notes', 'Read/search notes in one accessible calendar. Dates are inclusive; undated=true reads the Todo List. Paginate with offset.', {calendar_id:id,from:date.optional(),to:date.optional(),undated:z.boolean().optional(),search:z.string().max(200).optional(),limit:z.number().int().min(1).max(200).default(100),offset:z.number().int().min(0).max(1000000).default(0)}, true],
  ['create_note', 'Add a note to a calendar date, or date=null to the Todo List/canvas. Uses calendar default color when omitted; respects existing free-note limits.', {calendar_id:id,text:noteFields.text,date,color:color.optional(),pos_x:noteFields.pos_x.optional(),pos_y:noteFields.pos_y.optional(),sort_order:noteFields.sort_order.optional()}],
  ['update_note', 'Edit text/color, set is_struck explicitly (true=done, false=undo), move to another date/calendar, position on canvas, or reorder within a day. Requires editor/owner rights in both calendars when moving.', {note_id:id,changes:patch(noteFields)}],
  ['delete_note', 'Permanently delete a note and its connections. Requires explicit user authorization and editor/owner rights.', {note_id:id,confirm:z.literal(true)}, false, true],
  ['list_connections', 'List note connections in one accessible calendar.', {calendar_id:id}, true],
  ['create_connection', 'Connect two different notes in the same accessible calendar. Existing connections are returned without toggling/deleting.', {calendar_id:id,source_note_id:id,target_note_id:id}],
  ['delete_connection', 'Delete a connection, keeping its notes. Requires explicit user authorization.', {connection_id:id,confirm:z.literal(true)}, false, true],
  ['get_settings', 'Read your saved calendar appearance, visibility, years and runway settings. These apply when the website reloads.', {}, true],
  ['update_settings', 'Merge validated calendar appearance, visibility, year or runway preferences into your own saved settings. No account/authentication/payment changes.', {changes:settings}],
  ['create_invite', 'Create an expiring viewer/editor invitation for a calendar you can edit. Never grants ownership. Share only with recipients authorized by the user.', {calendar_id:id,role:z.enum(['viewer','editor']).default('editor'),expires_in_days:z.number().int().min(1).max(90).default(14)}],
  ['accept_invite', 'Accept a Calendar365 invitation supplied by the user.', {token:z.string().uuid()}],
  ['list_share_links', 'List your public calendar share links and their permissions. Passwords are never returned.', {include_revoked:z.boolean().default(false)}, true],
  ['create_share_link', 'Publish a viewer/editor share link for selected calendars using existing share RPC permissions. Obtain explicit user authorization before exposing calendar content; optional password protects the link.', {...shareFields,password:shareFields.password.optional()}],
  ['update_share_link', 'Change a public share link scope, slug, permissions or password. Obtain authorization before expanding access or removing a password.', {share_link_id:id,changes:patch({...shareFields,remove_password:z.boolean()})}],
  ['revoke_share_link', 'Revoke a public share link. Calendar data remains intact.', {share_link_id:id,confirm:z.literal(true)}, false, true],
];

export function createCalendarMcp(db, token) {
  const server = new McpServer({name:'calendar365',version:'1.0.0'});
  for (const [name, description, fields, readOnly = false, destructive = false] of toolDefinitions) {
    server.registerTool(name, {
      description, inputSchema:z.object(fields).strict(),
      annotations:{readOnlyHint:readOnly,destructiveHint:destructive,openWorldHint:false},
    }, async args => {
      const {data,error} = await db.rpc('mcp_execute',{p_token:token,p_operation:name,p_args:args});
      if (error) {
        console.error('Calendar365 MCP operation failed', name, error.code);
        return {isError:true,content:[{type:'text',text:'Operation rejected: check access, identifiers and arguments. No changes were committed.'}]};
      }
      return {content:[{type:'text',text:JSON.stringify(data)}]};
    });
  }
  return server;
}
