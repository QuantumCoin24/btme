import {
  type PropsWithChildren,
  useEffect,
} from 'react';
import {
  usePathname,
  useRouter,
} from 'expo-router';

import { useAuth } from '../auth/AuthContext';
import { useMembership } from '../membership/MembershipContext';

const COMPLETED_MEMBER_BLOCKED_ROUTES = new Set([
  '/birthday',
  '/name',
  '/location',
  '/verify',
  '/liveness',
  '/verified',
  '/photos',
  '/intent',
  '/looking-for',
  '/lifestyle',
  '/perfect-sunday',
  '/green-flag',
  '/absolutely-not',
  '/quick-chemistry',
  '/dealbreakers',
  '/profile-preview',
  '/membership',
]);

export function CompletedMemberRouteGuard({
  children,
}: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    initialized,
    user,
  } = useAuth();

  const {
    accessState,
    loading,
  } = useMembership();

  const profileComplete =
    accessState?.profileComplete === true;

  const shouldRedirect =
    initialized &&
    Boolean(user) &&
    !loading &&
    profileComplete &&
    COMPLETED_MEMBER_BLOCKED_ROUTES.has(pathname);

  useEffect(() => {
    if (!shouldRedirect) {
      return;
    }

    router.replace('/(main)/discover' as never);
  }, [
    router,
    shouldRedirect,
  ]);

  if (shouldRedirect) {
    return null;
  }

  return children;
}
