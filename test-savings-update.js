import fetch from 'node-fetch';

const testSavingsUpdate = async () => {
  try {
    // First, create a test saving
    console.log('Creating test saving...');
    const createResponse = await fetch('http://localhost:5001/api/savings/test-user-123', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Cel Oszczędnościowy',
        goal: 1000
      })
    });

    const createData = await createResponse.json();
    console.log('Create response:', createData);

    if (createResponse.ok && createData.id) {
      // Now update the saving
      console.log('\nUpdating saving...');
      const updateResponse = await fetch(`http://localhost:5001/api/savings/${createData.id}/test-user-123`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Zaktualizowany Cel Oszczędnościowy',
          goal: 1500
        })
      });

      const updateData = await updateResponse.json();
      console.log('Update response:', updateData);

      // Test validation - try to set goal less than deposited
      console.log('\nTesting validation - goal less than deposited...');
      const depositResponse = await fetch('http://localhost:5001/api/savings/deposit/test-user-123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 500,
          saving_id: createData.id
        })
      });

      const depositData = await depositResponse.json();
      console.log('Deposit response:', depositData);

      // Now try to set goal less than deposited (should fail)
      console.log('\nTesting validation - setting goal less than deposited...');
      const invalidUpdateResponse = await fetch(`http://localhost:5001/api/savings/${createData.id}/test-user-123`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Invalid Goal',
          goal: 200
        })
      });

      const invalidUpdateData = await invalidUpdateResponse.json();
      console.log('Invalid update response:', invalidUpdateData);

      // Clean up - delete the test saving
      console.log('\nCleaning up - deleting test saving...');
      const deleteResponse = await fetch(`http://localhost:5001/api/savings/${createData.id}`, {
        method: 'DELETE'
      });

      const deleteData = await deleteResponse.json();
      console.log('Delete response:', deleteData);
    }
  } catch (error) {
    console.error('Error testing savings update:', error);
  }
};

console.log('Testing savings update functionality...');
await testSavingsUpdate();
