import {expect,it} from 'vitest';
import {nextServiceStatus} from './service-progress';
it.each([
  ['emergency_dispatch','mobilizing','start',null],
  ['emergency_dispatch','arrived','start','in_progress'],
  ['direct_consultation','mobilizing','start','in_progress'],
  ['direct_consultation','arrived','start',null],
  ['emergency_dispatch','mobilizing','complete',null],
  ['emergency_dispatch','arrived','complete',null],
  ['emergency_dispatch','in_progress','complete','completed'],
  ['direct_consultation','in_progress','complete','completed'],
  ['emergency_dispatch','completed','start',null],
])('%s %s %s -> %s',(workflow,status,action,expected)=>{
  expect(nextServiceStatus(workflow,status,action)).toBe(expected);
});
