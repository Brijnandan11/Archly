// Event team size includes its leader; team_members stores the other students.
export const memberCapacity=teamSize=>Math.max(0,Number(teamSize)-1);
export const remainingSlots=(teamSize,members)=>Math.max(0,memberCapacity(teamSize)-Number(members));
