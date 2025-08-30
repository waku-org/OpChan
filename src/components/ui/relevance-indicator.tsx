import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  Clock,
  Shield,
  UserCheck,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { RelevanceScoreDetails } from '@/types/forum';

interface RelevanceIndicatorProps {
  score: number;
  details?: RelevanceScoreDetails;
  type: 'post' | 'comment' | 'cell';
  className?: string;
  showTooltip?: boolean;
}

export function RelevanceIndicator({
  score,
  details,
  type,
  className,
  showTooltip = false,
}: RelevanceIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'bg-green-500 hover:bg-green-600';
    if (score >= 10) return 'bg-blue-500 hover:bg-blue-600';
    if (score >= 5) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  const formatScore = (score: number) => {
    return score.toFixed(1);
  };

  const createTooltipContent = () => {
    if (!details) return `Relevance Score: ${formatScore(score)}`;

    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold">
          Relevance Score: {formatScore(score)}
        </div>
        <div>Base: {formatScore(details.baseScore)}</div>
        <div>Engagement: +{formatScore(details.engagementScore)}</div>
        {details.authorVerificationBonus > 0 && (
          <div>
            Author Bonus: +{formatScore(details.authorVerificationBonus)}
          </div>
        )}
        {details.verifiedUpvoteBonus > 0 && (
          <div>
            Verified Upvotes: +{formatScore(details.verifiedUpvoteBonus)}
          </div>
        )}
        {details.verifiedCommenterBonus > 0 && (
          <div>
            Verified Commenters: +{formatScore(details.verifiedCommenterBonus)}
          </div>
        )}
        <div>Time Decay: ×{details.timeDecayMultiplier.toFixed(2)}</div>
        {details.isModerated && (
          <div>Moderation: ×{details.moderationPenalty.toFixed(1)}</div>
        )}
      </div>
    );
  };

  const badge = (
    <Badge
      variant="secondary"
      className={`cursor-pointer ${getScoreColor(score)} text-white ${className}`}
      title={showTooltip ? undefined : 'Click to see relevance score details'}
    >
      <TrendingUp className="w-3 h-3 mr-1" />
      {formatScore(score)}
    </Badge>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>{badge}</DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {createTooltipContent()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <DialogTrigger asChild>{badge}</DialogTrigger>
        )}

        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Relevance Score Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Final Score: {formatScore(score)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {type.charAt(0).toUpperCase() + type.slice(1)} relevance score
                </div>
              </CardContent>
            </Card>

            {details && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span>Base Score</span>
                      </div>
                      <span className="font-mono">
                        {formatScore(details.baseScore)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                        <span>
                          Engagement ({details.upvotes} upvotes,{' '}
                          {details.comments} comments)
                        </span>
                      </div>
                      <span className="font-mono">
                        +{formatScore(details.engagementScore)}
                      </span>
                    </div>

                    {details.authorVerificationBonus > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-purple-500" />
                          <span>Author Verification Bonus</span>
                        </div>
                        <span className="font-mono">
                          +{formatScore(details.authorVerificationBonus)}
                        </span>
                      </div>
                    )}

                    {details.verifiedUpvoteBonus > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-indigo-500" />
                          <span>
                            Verified Upvotes ({details.verifiedUpvotes})
                          </span>
                        </div>
                        <span className="font-mono">
                          +{formatScore(details.verifiedUpvoteBonus)}
                        </span>
                      </div>
                    )}

                    {details.verifiedCommenterBonus > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-teal-500" />
                          <span>
                            Verified Commenters ({details.verifiedCommenters})
                          </span>
                        </div>
                        <span className="font-mono">
                          +{formatScore(details.verifiedCommenterBonus)}
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span>
                          Time Decay ({details.daysOld.toFixed(1)} days old)
                        </span>
                      </div>
                      <span className="font-mono">
                        ×{details.timeDecayMultiplier.toFixed(3)}
                      </span>
                    </div>

                    {details.isModerated && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span>Moderation Penalty</span>
                        </div>
                        <span className="font-mono">
                          ×{details.moderationPenalty.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">User Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <UserCheck
                        className={`w-4 h-4 ${details.isVerified ? 'text-green-500' : 'text-gray-400'}`}
                      />
                      <span
                        className={
                          details.isVerified
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }
                      >
                        {details.isVerified
                          ? 'Verified User'
                          : 'Unverified User'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
