
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import type { UserProfile, WithId } from '@/lib/types';
import { getChatPartners } from '@/actions/user-actions';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createOrGetChat } from '@/actions/p2p-chat-actions';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function P2PChatPartnerItem({
  partner,
  onToggle,
  isSelected,
}: {
  partner: WithId<UserProfile>;
  onToggle: (partnerId: string) => void;
  isSelected: boolean;
}) {
  const getInitials = (name: string = '') => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <div
      className={cn("flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors", isSelected && "bg-primary/10")}
      onClick={() => onToggle(partner.id)}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle(partner.id)}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={partner.photoURL} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {getInitials(partner.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold">{partner.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{partner.role}</p>
        </div>
      </div>
      <Checkbox checked={isSelected} onCheckedChange={() => onToggle(partner.id)} />
    </div>
  );
}


export default function P2PChatListPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [partners, setPartners] = useState<WithId<UserProfile>[] | null>(null);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoading(false);
      setError("Je moet ingelogd zijn om te chatten.");
      return;
    }

    const fetchPartners = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPartners = await getChatPartners(user.uid);
        setPartners(fetchedPartners);
      } catch (e: any) {
        console.error("Failed to fetch chat partners via Server Action:", e);
        setError(e.message || "Kon geen chatpartners ophalen.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartners();
  }, [user, isUserLoading]);

  const handleTogglePartner = (partnerId: string) => {
    setSelectedPartnerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(partnerId)) {
        newSet.delete(partnerId);
      } else {
        newSet.add(partnerId);
      }
      return newSet;
    });
  };

  const handleStartChat = async () => {
    if (!user || isProcessing) return;

    const selectedIds = Array.from(selectedPartnerIds);
    if (selectedIds.length === 0) {
      toast({ variant: "destructive", title: "Selecteer een partner", description: "Kies minstens één persoon om een chat mee te starten." });
      return;
    }
    
    setIsProcessing(true);
    
    const participantIds = [user.uid, ...selectedIds];
    const isGroupChat = participantIds.length > 2;
    const nameForChat = isGroupChat ? groupName.trim() : null;

    if (isGroupChat && !nameForChat) {
      toast({ variant: "destructive", title: "Groepsnaam vereist", description: "Geef je groepschat een naam." });
      setIsProcessing(false);
      return;
    }

    const { chatId, error } = await createOrGetChat(participantIds, nameForChat);
    
    if (chatId) {
      router.push(`/p2p-chat/${chatId}`);
    } else {
      toast({ variant: "destructive", title: "Kon chat niet starten", description: error });
      setIsProcessing(false);
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64"><Spinner /></div>
      </div>
    );
  }

  const selectedCount = selectedPartnerIds.size;
  const isGroupCreation = selectedCount > 1;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Users className="h-6 w-6 mr-3" />
            Start een gesprek
          </CardTitle>
          <CardDescription>Selecteer één of meer teamleden om een 1-op-1 of groepsgesprek te starten.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" /><AlertTitle>Fout</AlertTitle><AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isGroupCreation && (
            <div className="p-4 mb-4 border rounded-lg bg-muted/50 space-y-2">
                <label className="font-semibold">Groepsnaam</label>
                <Input 
                    placeholder="Voer een naam in voor deze groep..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Deelnemers: {selectedCount + 1}</p>
            </div>
          )}

          {!error && partners && partners.length > 0 && (
            <div className="border rounded-lg mb-4">
              {partners.map(partner => (
                <P2PChatPartnerItem 
                  key={partner.id} 
                  partner={partner}
                  onToggle={handleTogglePartner}
                  isSelected={selectedPartnerIds.has(partner.id)}
                />
              ))}
            </div>
          )}
          
          {selectedPartnerIds.size > 0 && (
            <Button 
                onClick={handleStartChat} 
                disabled={isProcessing || (isGroupCreation && !groupName.trim())} 
                className="w-full" size="lg"
            >
              {isProcessing ? <Spinner size="small" className="mr-2" /> : (
                <>
                  {isGroupCreation ? `Start Groepschat (${selectedCount + 1})` : "Start 1-op-1 Chat"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {!error && (!partners || partners.length === 0) && (
            <Alert>
              <Users className="h-4 w-4" /><AlertTitle>Geen Teamleden</AlertTitle><AlertDescription>Er zijn geen andere leden in je team gevonden om mee te chatten.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
