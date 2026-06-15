const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/election').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('notifications').updateMany(
    { senderModel: 'Admin', type: 'reclamation' },
    { $set: { senderModel: 'RoleElectionDay' } }
  );
  console.log('Updated DB');
  process.exit(0);
});
