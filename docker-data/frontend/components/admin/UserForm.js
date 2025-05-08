import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  isAdmin: z.boolean().default(false),
});

const refinedUserSchema = userSchema.superRefine((data, ctx) => {
  if (!data.isEditing && (!data.password || data.password.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password is required for new users",
      path: ["password"],
    });
  }
  if (data.password && data.password.length > 0) {
    const passwordValidation = passwordSchema.safeParse(data.password);
    if (!passwordValidation.success) {
      passwordValidation.error.errors.forEach(err => {
        ctx.addIssue({
          ...err,
          path: ["password"],
        });
      });
    }
  }
});

export default function UserForm({ open, onOpenChange, onSubmit, initialData }) {
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(refinedUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      isAdmin: false,
      isEditing: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          username: initialData.username || '',
          email: initialData.email || '',
          password: '',
          isAdmin: initialData.isAdmin || false,
          isEditing: true,
        });
      } else {
        reset({
          username: '',
          email: '',
          password: '',
          isAdmin: false,
          isEditing: false,
        });
      }
    }
  }, [initialData, open, reset]);

  const handleFormSubmit = (data) => {
    const { isEditing: editingFlag, ...userData } = data;
    if (!isEditing && !userData.password) {
      alert("Password is required for new users.");
      return;
    }
    if (isEditing && !userData.password) {
      delete userData.password;
    }
    onSubmit(userData);
  };
  
  const handleOpenChangeWithReset = (isOpen) => {
    if (!isOpen) {
      reset({
        username: '',
        email: '',
        password: '',
        isAdmin: false,
        isEditing: false,
      });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWithReset}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the user\'s details." : 'Enter the details for the new user.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className={cn("text-right", errors.username && "text-destructive")}>
              Username
            </Label>
            <div className="col-span-3">
              <Input
                id="username"
                {...register("username")}
                className={cn(errors.username && "border-destructive")}
              />
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className={cn("text-right", errors.email && "text-destructive")}>
              Email
            </Label>
            <div className="col-span-3">
              <Input
                id="email"
                type="email"
                {...register("email")}
                className={cn(errors.email && "border-destructive")}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className={cn("text-right", errors.password && "text-destructive")}>
              Password
            </Label>
            <div className="col-span-3">
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder={isEditing ? "Leave blank to keep current" : "Required (min 8 chars)"}
                className={cn(errors.password && "border-destructive")}
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isAdmin" className="text-right col-span-1">
              Admin
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                id="isAdmin"
                checked={control._formValues.isAdmin}
                onCheckedChange={(checked) => {
                  reset({ ...control._formValues, isAdmin: !!checked });
                }}
              />
              <label
                htmlFor="isAdmin"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Is this user an administrator?
              </label>
            </div>
            {errors.isAdmin && <p className="col-span-3 col-start-2 text-xs text-destructive mt-1">{errors.isAdmin.message}</p>}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
