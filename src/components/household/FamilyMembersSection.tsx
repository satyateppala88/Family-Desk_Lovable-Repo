import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AvatarUploader } from "@/components/avatar/AvatarUploader";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface FamilyMember {
  id: string;
  household_id: string;
  name: string;
  relationship: string | null;
  avatar_url: string | null;
}

interface Props {
  householdId: string;
}

export const FamilyMembersSection = ({ householdId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["household-family-members", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("household_family_members")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as FamilyMember[];
    },
    enabled: !!householdId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["household-family-members", householdId] });

  const createMember = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("household_family_members").insert({
        household_id: householdId,
        name: name.trim(),
        relationship: relationship.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Family member added");
      setName("");
      setRelationship("");
      setOpen(false);
      invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Failed to add"),
  });

  const updateAvatar = async (memberId: string, url: string | null) => {
    const { error } = await supabase
      .from("household_family_members")
      .update({ avatar_url: url })
      .eq("id", memberId);
    if (error) throw error;
    invalidate();
  };

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("household_family_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Family Members
          </CardTitle>
          <CardDescription>
            Add photos for kids, grandparents, or anyone in your family who doesn't have an account.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a family member</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-name">Name</Label>
                <Input id="fm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-rel">Relationship (optional)</Label>
                <Input
                  id="fm-rel"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Son, Grandfather"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMember.mutate()} disabled={createMember.isPending || !name.trim()}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No family members added yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-12 w-12">
                    {m.avatar_url ? <AvatarImage src={m.avatar_url} alt="" /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {m.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    {m.relationship && (
                      <p className="text-xs text-muted-foreground truncate">{m.relationship}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AvatarUploader
                    scope={{ kind: "family", householdId, memberId: m.id }}
                    currentUrl={m.avatar_url}
                    fallbackInitials={m.name}
                    size="sm"
                    onChange={(url) => updateAvatar(m.id, url)}
                    className="hidden sm:flex"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setMemberToRemove({ id: m.id, name: m.name })}
                    disabled={removeMember.isPending}
                    className="text-destructive hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to this household and all shared data.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { removeMember.mutate(memberToRemove!.id); setMemberToRemove(null); }}
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
