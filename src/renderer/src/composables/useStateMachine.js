import { ref, readonly } from 'vue'

export const STATES = {
  IDLE: 'idle',
  STANDBY: 'standby',
  LISTENING: 'listening',
  SPEAKING: 'speaking'
}

const TRANSITIONS = {
  [STATES.IDLE]: { LOGIN_SUCCESS: STATES.STANDBY },
  [STATES.STANDBY]: {
    SEND_MESSAGE: STATES.SPEAKING,
    START_LISTENING: STATES.LISTENING
  },
  [STATES.LISTENING]: {
    STOP_LISTENING: STATES.SPEAKING,
    CANCEL_LISTENING: STATES.STANDBY
  },
  [STATES.SPEAKING]: { REPLY_COMPLETE: STATES.STANDBY }
}

export function useStateMachine() {
  const currentState = ref(STATES.IDLE)

  function transition(event) {
    const allowed = TRANSITIONS[currentState.value]
    if (!allowed || !allowed[event]) {
      console.warn(`Invalid transition: ${currentState.value} + ${event}`)
      return false
    }
    currentState.value = allowed[event]
    return true
  }

  function reset() {
    currentState.value = STATES.IDLE
  }

  return {
    currentState: readonly(currentState),
    transition,
    reset,
    STATES
  }
}
