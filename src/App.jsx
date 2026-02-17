import React from 'react'
import DraggableAvatar from './DraggableAvatar'

function App() {
  return (
    <div className='w-full h-screen bg-white relative overflow-hidden'>

      <span className='text-3xl justify-center items-center'>this screen need to be captured.</span>
      <DraggableAvatar />

    
    </div>
  )
}

export default App