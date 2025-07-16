// Simple debug logger for SDS operations
export const SDSDebug = {
  enabled: true,
  
  log(message: string, data?: any) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[SDS ${timestamp}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  },
  
  logVote(action: string, voteKey: string, data?: any) {
    this.log(`VOTE ${action} - ${voteKey}`, data);
  }
};