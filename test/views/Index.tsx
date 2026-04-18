import React from 'react';

// Props otomatis nerima data dari ctx.render
const Index = ({ userId }: any) => {
  return (
    <div className="p-10">
      <h1 className="text-pink-400 text-3xl font-bold">Gaman x React</h1>
      <p className="mt-4">User ID dari Controller: {userId}</p>
      
      <button 
        onClick={() => alert('React jalan!')}
        className="mt-4 bg-pink-500 px-4 py-2 rounded"
      >
        Test Interaktivitas
      </button>
    </div>
  );
};

export default Index;