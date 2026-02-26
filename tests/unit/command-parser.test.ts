import { parseSmsCommand } from '@/sms/command-parser';

describe('parseSmsCommand', () => {
  it('parses numeric commands', () => {
    expect(parseSmsCommand('1').type).toBe('DONE');
    expect(parseSmsCommand('2').type).toBe('ROLLOVER');
    expect(parseSmsCommand('4').type).toBe('DONE_ALL');
  });

  it('parses snooze with optional duration', () => {
    expect(parseSmsCommand('SNOOZE 45')).toEqual({ type: 'SNOOZE', minutes: 45 });
    expect(parseSmsCommand('3')).toEqual({ type: 'SNOOZE', minutes: undefined });
  });

  it('parses breakdown replies', () => {
    expect(parseSmsCommand('wash, dry, fold')).toEqual({
      type: 'BREAKDOWN',
      subtasks: ['wash', 'dry', 'fold']
    });
  });
});
