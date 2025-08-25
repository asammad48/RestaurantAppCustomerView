import { useState } from "react";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/lib/store";

export default function ReviewModal() {
  const { isReviewModalOpen, setReviewModalOpen, setOrderConfirmationOpen } = useCartStore();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmitReview = () => {
    setReviewModalOpen(false);
    setOrderConfirmationOpen(true);
  };

  return (
    <Dialog open={isReviewModalOpen} onOpenChange={setReviewModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold configurable-text-primary">Rate Your Experience</DialogTitle>
          <DialogDescription className="configurable-text-secondary">
            Share your feedback to help us improve
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={40}
                  className={`cursor-pointer transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'configurable-primary-text configurable-primary-text'
                      : 'text-gray-300'
                  }`}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
          </div>
          
          {/* Review Text */}
          <div>
            <Textarea
              placeholder="Write a quick Review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
          
          <Button 
            onClick={handleSubmitReview} 
            className="w-full configurable-primary text-white font-bold hover:configurable-primary-hover"
          >
            Submit Review & Claim Cashback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
