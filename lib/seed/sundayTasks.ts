export const defaultSundayTasks: Array<{
  id: string;
  name: string;
  amount: string;
  description: string;
}> = [
  {
    id: 'task_pre',
    name: 'Pre-Sterilization',
    amount: '250',
    description: 'Prepare instruments for sterilization',
  },
  {
    id: 'task_post',
    name: 'Post-Sterilization',
    amount: '250',
    description: 'Complete sterilization process',
  },
];