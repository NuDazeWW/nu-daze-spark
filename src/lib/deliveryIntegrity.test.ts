import { describe, it, expect } from 'vitest';
import { deliveryGroup, deliveryLabel } from './deliveryPresentation';
import { clearPackageDrafts, readPackageDraft, writePackageDraft } from './packageDrafts';
import { evaluateReadiness } from './readiness';
import { draftChecksum } from './preflightRules';
describe('delivery and persistence safeguards', () => {
 it('distinguishes staged from confirmed live and manual delivery', () => {
  expect(deliveryLabel('staged')).toBe('Staged — not sent');
  expect(deliveryLabel('platform_confirmed')).toBe('Published live (confirmed)');
  expect(deliveryLabel('manual_confirmed')).toBe('Marked as posted by hand');
 });
 it('keeps partial and unknown outcomes out of completed delivery groups', () => {
  expect(deliveryGroup('partial')).toBe('failed');
  expect(deliveryGroup('awaiting_confirmation')).toBe('upcoming');
 });
 it('retains unsaved text for the same user, client and post only', () => {
  clearPackageDrafts(); writePackageDraft('user:client:post', { notes: 'keep my text' });
  expect(readPackageDraft('user:client:post', {})).toEqual({ notes: 'keep my text' });
  expect(readPackageDraft('user:other:post', {})).toEqual({});
 });
 it('clears saved typing on sign-out or workspace switch', () => {
  writePackageDraft('user:client:post', { notes: 'private' }); clearPackageDrafts();
  expect(readPackageDraft('user:client:post', {})).toEqual({});
 });
 it('never allows acknowledgment or override to bypass required findings', () => {
  const card = { draft_copy: 'A real post', hashtags: [], approval_status: 'approved' } as any;
  const r = { findings: [{ severity: 'blocking' }], draft_checksum: draftChecksum(card), overall_status: 'blocked', overridden_at: '2026-10-20', acknowledged_at: '2026-10-20' } as any;
  expect(evaluateReadiness(card, r, { approvalRequired: true, preflightMode: 'advisory' }).canDeliver).toBe(false);
 });
});
