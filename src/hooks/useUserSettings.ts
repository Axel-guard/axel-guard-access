import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface UserSettings {
  email_notifications: boolean;
  payment_alerts: boolean;
  lead_alerts: boolean;
  dark_mode: boolean;
  compact_view: boolean;
}

const defaultSettings: UserSettings = {
  email_notifications: true,
  payment_alerts: true,
  lead_alerts: false,
  dark_mode: false,
  compact_view: false,
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Ensure settings exist
      await supabase.rpc('ensure_user_settings');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          payment_alerts: data.payment_alerts,
          lead_alerts: data.lead_alerts,
          dark_mode: data.dark_mode,
          compact_view: data.compact_view,
        });

        // Apply dark mode immediately
        if (data.dark_mode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Apply compact view
        if (data.compact_view) {
          document.documentElement.classList.add('compact');
        } else {
          document.documentElement.classList.remove('compact');
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update a single setting
  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!user) return;

    const previousSettings = { ...settings };
    
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }));

    // Apply visual changes immediately
    if (key === 'dark_mode') {
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    if (key === 'compact_view') {
      if (value) {
        document.documentElement.classList.add('compact');
      } else {
        document.documentElement.classList.remove('compact');
      }
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Setting Updated",
        description: `${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} has been ${value ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      // Rollback on error
      setSettings(previousSettings);
      
      if (key === 'dark_mode') {
        if (previousSettings.dark_mode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      toast({
        title: "Error",
        description: "Failed to update setting. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update profile (name via user metadata, email via Supabase Auth)
  const updateProfile = async (fullName: string, email: string) => {
    if (!user) return false;

    setIsSaving(true);
    try {
      // Validate
      if (!fullName.trim()) {
        toast({
          title: "Validation Error",
          description: "Full name cannot be empty.",
          variant: "destructive",
        });
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return false;
      }

      // Update user metadata (for full name)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (metaError) throw metaError;

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email
        });

        if (emailError) throw emailError;

        toast({
          title: "Profile Updated",
          description: "A confirmation email has been sent to your new email address.",
        });
      } else {
        toast({
          title: "Profile Updated Successfully",
          description: "Your profile information has been saved.",
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Update password
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return false;

    setIsSaving(true);
    try {
      // Validate new password
      if (newPassword.length < 6) {
        toast({
          title: "Validation Error",
          description: "New password must be at least 6 characters.",
          variant: "destructive",
        });
        return false;
      }

      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Authentication Failed",
          description: "Incorrect current password.",
          variant: "destructive",
        });
        return false;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      return true;
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    updateProfile,
    updatePassword,
    refetch: loadSettings,
  };
};
