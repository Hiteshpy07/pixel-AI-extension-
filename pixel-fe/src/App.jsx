import React from 'react'
import DraggableAvatar from './DraggableAvatar'

function App() {
  return (
    <div className='w-full h-screen bg-black relative overflow-hidden'>

      {/* <span className='text-3xl justify-center items-center'>this screen need to be captured.</span> */}
      <span className='font-mono text-3xl text-amber-100 flex justify-center items-center mt-70'>PIXEL:Your Screen assistant.</span>
      <span className='font-mono text-lg text-gray-200 ml-[23%] mt-4'>a screen grab example for now, before the avatar starts floating...</span>
      
      <DraggableAvatar />

    
    </div>
  )
}

export default App