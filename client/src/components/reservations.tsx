import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Users, Building2 } from 'lucide-react';
import { reservationService } from '@/services/reservation-service';
import { useAuthStore } from '@/lib/auth-store';
import { Reservation } from '@/types/reservation';
import { format, parseISO } from 'date-fns';

export default function Reservations() {
  const { token, isAuthenticated, setLoginModalOpen } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reservations', currentPage],
    queryFn: () => reservationService.getUserReservations(token!, {
      pageNumber: currentPage,
      pageSize: pageSize
    }),
    enabled: !!token,
    staleTime: 30000, // 30 seconds
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated || !token) {
    return (
      <div className="space-y-4" data-testid="reservations-auth-required">
        <h2 className="text-2xl font-bold">My Reservations</h2>
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Please log in to view reservations</h3>
            <p className="text-gray-600 mb-4">
              You need to be logged in to view your reservation history.
            </p>
            <Button 
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center space-x-2"
              data-testid="button-login"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="reservations-loading">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Reservations</h2>
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4" data-testid="reservations-error">
        <h2 className="text-2xl font-bold">My Reservations</h2>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load reservations. Please try again.
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="ml-2"
              data-testid="button-retry"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="space-y-4" data-testid="reservations-empty">
        <h2 className="text-2xl font-bold">My Reservations</h2>
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No reservations yet</h3>
            <p className="text-gray-600">
              Your reservation history will appear here once you make your first reservation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reservations">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Reservations</h2>
        <p className="text-sm text-gray-600">
          {data.totalCount} total reservations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.items.map((reservation) => (
          <ReservationCard key={reservation.id} reservation={reservation} />
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between" data-testid="pagination">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!data.hasPrevious}
            data-testid="button-previous-page"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600" data-testid="text-page-info">
            Page {data.pageNumber} of {data.totalPages}
          </span>
          
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!data.hasNext}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  
  const getStatusColor = (actionTaken: string) => {
    switch (actionTaken.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'pending':
        return 'bg-orange-100 text-orange-700 border border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getReservationDate = () => {
    try {
      return format(parseISO(reservation.reservationDate), 'MMM dd, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const getReservationTime = () => {
    try {
      // Parse time in format "HH:mm:ss" and format as "hh:mm a"
      const [hours, minutes] = reservation.reservationTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      return format(date, 'hh:mm a');
    } catch {
      return reservation.reservationTime;
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md w-full border rounded-lg" data-testid={`card-reservation-${reservation.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 mb-2" data-testid={`text-reservation-name-${reservation.id}`}>
              {reservation.reservationName}
            </CardTitle>
            <p className="text-sm text-gray-500 mb-1">Reservation Name</p>
            
            {/* Branch and Location Info */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-xs text-gray-600">
                <Building2 className="h-3 w-3 mr-1.5" />
                <span>{reservation.branchName}</span>
                <span className="text-gray-400 ml-1">(ID: {reservation.branchId})</span>
              </div>
              
              <div className="flex items-center text-xs text-gray-500">
                <MapPin className="h-3 w-3 mr-1.5" />
                <span>{reservation.locationName}</span>
                <span className="text-gray-400 ml-1">(ID: {reservation.locationId})</span>
              </div>
            </div>
          </div>
          <Badge className={`${getStatusColor(reservation.actionTaken)} text-sm px-3 py-1 rounded-full`} data-testid={`status-${reservation.id}`}>
            {reservation.actionTaken}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {/* Date and Time Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900" data-testid={`text-reservation-date-${reservation.id}`}>
                  {getReservationDate()}
                </p>
                <p className="text-xs text-gray-500">Reservation Date</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900" data-testid={`text-reservation-time-${reservation.id}`}>
                  {getReservationTime()}
                </p>
                <p className="text-xs text-gray-500">Reservation Time</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {reservation.numberOfGuests > 0 && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900" data-testid={`text-guests-${reservation.id}`}>
                    {reservation.numberOfGuests} {reservation.numberOfGuests === 1 ? 'Guest' : 'Guests'}
                  </p>
                  <p className="text-xs text-gray-500">Number of Guests</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}