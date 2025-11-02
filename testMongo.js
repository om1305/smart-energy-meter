const mongoose = require('mongoose');

const uri = 'mongodb+srv://ayshagupta8790_db_user:Energy1234@smartelectricity.srnuily.mongodb.net/smart_energy?retryWrites=true&w=majority';

mongoose.connect(uri)
  .then(() => console.log('✅ Connected successfully to MongoDB!'))
  .catch(err => console.error('❌ Connection failed:', err.message))
  .finally(() => mongoose.connection.close());
