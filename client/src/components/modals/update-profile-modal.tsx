import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Camera, Upload, User, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserProfile, UpdateProfileResponse } from "../../services/user-service";

interface UpdateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Profile update validation schema
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  mobileNumber: z.string().min(1, "Contact number is required").regex(/^[\d\s\-\+\(\)]+$/, "Please enter a valid contact number"),
});

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

// Avatar options for selection (URLs to actual avatar images)
const avatarOptions = [
  "👤", "👨‍💼", "👩‍💼", "👨‍🎓", "👩‍🎓", "👨‍🍳", "👩‍🍳", 
  "😊", "😎", "🤔", "😋", "🥳", "🤗", "😇", "🙂"
];

export default function UpdateProfileModal({ isOpen, onClose }: UpdateProfileModalProps) {
  const { user, setUser, token } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(user?.profilePicture || "");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || "",
      mobileNumber: user?.mobileNumber || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data: UpdateProfileResponse) => {
      // Update user data in store
      setUser({
        ...user!,
        name: data.name,
        mobileNumber: data.mobileNumber,
        profilePicture: data.profilePicture
      });
      
      // Invalidate React Query cache for user profile related queries
      queryClient.invalidateQueries({ queryKey: ['/api/User/profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setProfilePicture(file);
      setSelectedAvatar("");
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarSelect = (avatar: string) => {
    // Avatar selection temporarily disabled - only file uploads supported
    setShowAvatarSelection(false);
  };

  const handleSubmit = async (values: UpdateProfileFormValues) => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please login again.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('Name', values.name);
    formData.append('MobileNumber', values.mobileNumber);
    
    if (profilePicture) {
      formData.append('ProfilePicture', profilePicture);
    }

    updateProfileMutation.mutate({
      token,
      formData
    });
  };

  const resetForm = () => {
    form.reset({
      name: user?.name || "",
      mobileNumber: user?.mobileNumber || "",
    });
    setProfilePicture(null);
    setProfilePicturePreview(user?.profilePicture || "");
    setSelectedAvatar("");
    setShowAvatarSelection(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const removePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview("");
    setSelectedAvatar("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Update Profile</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage 
                    src={profilePicturePreview} 
                    alt="Profile" 
                  />
                  <AvatarFallback className="text-2xl">
                    {selectedAvatar || <User size={32} />}
                  </AvatarFallback>
                </Avatar>
                {(profilePicturePreview || selectedAvatar) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                    onClick={removePicture}
                  >
                    <X size={12} />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-photo"
              >
                <Upload size={16} className="mr-2" />
                Upload Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarSelection(!showAvatarSelection)}
                data-testid="button-select-avatar"
              >
                <Camera size={16} className="mr-2" />
                Choose Avatar
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Avatar Selection */}
            {showAvatarSelection && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-8 gap-2">
                    {avatarOptions.map((avatar, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={selectedAvatar === avatar ? "default" : "outline"}
                        className="w-10 h-10 text-lg p-0"
                        onClick={() => handleAvatarSelect(avatar)}
                        data-testid={`avatar-option-${index}`}
                      >
                        {avatar}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your name"
                      data-testid="input-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter your contact number"
                      data-testid="input-mobile"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={updateProfileMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={updateProfileMutation.isPending}
              data-testid="button-save"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}