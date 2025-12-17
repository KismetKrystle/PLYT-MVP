
const dns = require('dns');

const hostname = 'db.nbdwgcqanhdoouwkhjjf.supabase.co';

console.log('Looking up:', hostname);

dns.lookup(hostname, (err, address, family) => {
    if (err) {
        console.error('DNS Lookup failed:', err);
    } else {
        console.log('Address:', address);
        console.log('Family: IPv' + family);
    }
});

dns.resolve(hostname, (err, addresses) => {
    if (err) {
        console.error('DNS Resolve failed:', err);
    } else {
        console.log('Resolved addresses:', addresses);
    }
});
