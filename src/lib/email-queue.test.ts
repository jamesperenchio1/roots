import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the module under test.
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ error: null }) }) }) }),
});
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate, insert: mockInsert });

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
  SUPABASE_URL: 'https://test.supabase.co',
}));

vi.mock('./logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { scheduleEmailNotification } = await import('./email-queue');

describe('scheduleEmailNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-set up mock chains after clear
    const mockIsNull2 = vi.fn().mockResolvedValue({ error: null });
    const mockIsNull1 = vi.fn().mockReturnValue({ is: mockIsNull2 });
    const mockEq2 = vi.fn().mockReturnValue({ is: mockIsNull1 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    mockUpdate.mockReturnValue({ eq: mockEq1 });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ update: mockUpdate, insert: mockInsert });
  });

  test('calls supabase.from with correct table', async () => {
    await scheduleEmailNotification('user-1', 'conv-1', 'msg-1', 'Alice', 'Hello there');
    expect(mockFrom).toHaveBeenCalledWith('email_notification_queue');
  });

  test('calls update to cancel pending notifications first', async () => {
    await scheduleEmailNotification('user-1', 'conv-1', 'msg-1', 'Alice', 'Hello there');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ cancelled_at: expect.any(String) }));
  });

  test('calls insert with correct recipient and conversation IDs', async () => {
    await scheduleEmailNotification('user-42', 'conv-99', 'msg-7', 'Bob', 'Draft preview');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_id: 'user-42',
        conversation_id: 'conv-99',
        message_id: 'msg-7',
        sender_name: 'Bob',
        preview: 'Draft preview',
        scheduled_at: expect.any(String),
      })
    );
  });

  test('does not throw even if supabase returns an error', async () => {
    mockInsert.mockResolvedValueOnce({ error: new Error('DB error') });
    await expect(scheduleEmailNotification('u', 'c', 'm', 'X', 'Y')).resolves.toBeUndefined();
  });

  test('scheduled_at is a valid ISO string in the future', async () => {
    const before = Date.now();
    await scheduleEmailNotification('u', 'c', 'm', 'X', 'Y');
    const insertCall = mockInsert.mock.calls[0]?.[0];
    const scheduled = new Date(insertCall?.scheduled_at).getTime();
    expect(scheduled).toBeGreaterThan(before);
  });
});
