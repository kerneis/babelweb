#include <v8.h>
#include <node.h>

#include <sys/types.h>
#include <unistd.h>
#include <pwd.h>
#include <grp.h>
#include <errno.h>

using namespace node;
using namespace v8;

static Handle<Value> DropPrivileges (const Arguments&);
extern "C" void init (Handle<Object>);

static Handle<Value> DropPrivileges (const Arguments& args) {
  HandleScope scope;
  if (args.Length() != 1) {
    return ThrowException(Exception::Error(
          String::New("dropPrivileges requires 1 argument")));
  }
  if (!args[0]->IsString()) {
    return ThrowException(Exception::Error(
      String::New("dropPrivileges argument must be a string")));
  }

  struct passwd *pw;

  String::Utf8Value pwnam(args[0]->ToString());
  pw = getpwnam(*pwnam);

  if (pw == NULL) {
    if (errno == 0)
      return ThrowException(Exception::Error(
        String::New("user id does not exist")));
    else
      return ThrowException(ErrnoException(errno, "getpwnam"));
  }

  int rc;

  rc = initgroups(pw->pw_name, pw->pw_gid);
  if (rc < 0) {
      return ThrowException(ErrnoException(errno, "initgroups"));
  }

  uid_t gid = getgid();
  if(gid != 0) {
      return ThrowException(Exception::Error(
        String::New("dropPrivileges called with non-root GID")));
  }

  rc = setgid(pw->pw_gid);
  if (rc < 0) {
      return ThrowException(ErrnoException(errno, "setgid"));
  }

  uid_t uid = getuid();
  if(uid != 0) {
      return ThrowException(Exception::Error(
        String::New("dropPrivileges called with non-root UID")));
  }

  rc = setuid(pw->pw_uid);
  if (rc < 0) {
      return ThrowException(ErrnoException(errno, "setuid"));
  }

  return Undefined();
}

extern "C" void init (Handle<Object> target) {
  HandleScope scope;
  NODE_SET_METHOD(target, "dropPrivileges", DropPrivileges);
}
