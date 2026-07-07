'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, User, School } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signupSchema = z.object({
  schoolName: z.string().min(2, 'Nom de l\'école trop court').max(80, 'Nom trop long'),
  fullName:   z.string().min(2, 'Nom trop court').max(80, 'Nom trop long'),
  email:      z.string().email('Email invalide'),
  password:   z.string().min(8, '8 caractères minimum'),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()

    // school_name est lu par le trigger handle_new_user() côté base :
    // il crée l'organisation, le rôle admin, et le seed (niveaux + année).
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          school_name: values.schoolName,
        },
      },
    })

    if (error) {
      toast.error('Création du compte échouée', {
        description: error.message === 'User already registered'
          ? 'Un compte existe déjà avec cet email'
          : error.message,
      })
      setIsLoading(false)
      return
    }

    // Si la confirmation email est activée côté Supabase, pas de session ici
    if (!data.session) {
      toast.success('Compte créé !', {
        description: 'Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.',
      })
      router.push('/auth/login')
      return
    }

    toast.success(`Bienvenue ! Ton école « ${values.schoolName} » est prête.`)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Nom de l'école */}
      <div className="space-y-1.5">
        <Label htmlFor="schoolName">Nom de votre école</Label>
        <Input
          id="schoolName"
          type="text"
          placeholder="ex. English Club Paris"
          autoFocus
          leftIcon={<School className="h-4 w-4" />}
          error={errors.schoolName?.message}
          {...register('schoolName')}
        />
      </div>

      {/* Nom complet */}
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Votre nom</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Prénom Nom"
          autoComplete="name"
          leftIcon={<User className="h-4 w-4" />}
          error={errors.fullName?.message}
          {...register('fullName')}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse email</Label>
        <Input
          id="email"
          type="email"
          placeholder="vous@exemple.fr"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <Button type="submit" className="w-full" loading={isLoading}>
        {isLoading ? 'Création…' : 'Créer mon école'}
      </Button>
    </form>
  )
}
