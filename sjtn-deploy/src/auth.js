import { supabase } from './supabase'

// Sign up a new user
export const signUp = async (email, password, firstName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName }
    }
  })
  if (error) return { error }
  return { user: data.user }
}

// Sign in existing user
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) return { error }
  return { user: data.user }
}

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) return { error }
  return { success: true }
}

// Get current logged in user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}