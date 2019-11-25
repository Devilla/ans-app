import React, { useState } from 'react'
import styled from '@emotion/styled'
import { useQuery } from 'react-apollo'

import {
  SET_RESOLVER,
  SET_ADDRESS,
  SET_CONTENT,
  SET_CONTENTHASH,
  SET_TEXT,
  SET_ADDR
} from 'graphql/mutations'
import {
  GET_TEXT,
  GET_ADDR,
  GET_RESOLVER_MIGRATION_INFO
} from 'graphql/queries'

import DetailsItemEditable from '../DetailsItemEditable'
import AddRecord from './AddRecord'
import RecordsItem from './RecordsItem'
import TextRecord from './TextRecord'
import Address from './Address'

const RecordsWrapper = styled('div')`
  border-radius: 6px;
  border: 1px solid #ededed;
  box-shadow: inset 0 0 10px 0 rgba(235, 235, 235, 0.5);
  padding-bottom: ${p => (p.shouldShowRecords ? '10px' : '0')};
  display: ${p => (p.shouldShowRecords ? 'block' : 'none')};
  margin-bottom: 20px;
`

const CantEdit = styled('div')`
  padding: 20px;
  font-size: 14px;
  color: #adbbcd;
  background: hsla(37, 91%, 55%, 0.1);
`

const RECORDS = [
  {
    label: 'Address',
    value: 'address'
  },
  {
    label: 'Other addresses',
    value: 'otherAddresses'
  },
  {
    label: 'Content',
    value: 'content'
  },
  {
    label: 'Text',
    value: 'text'
  }
]

function isEmpty(record) {
  if (parseInt(record, 16) === 0) {
    return true
  }
  if (record === '0x') {
    return true
  }
  if (!record) {
    return true
  }
  return false
}

function hasAResolver(resolver) {
  return parseInt(resolver, 16) !== 0
}

function hasAnyRecord(domain) {
  if (!isEmpty(domain.addr)) {
    return true
  }

  if (!isEmpty(domain.content)) {
    return true
  }
}

function calculateShouldShowRecords(isOwner, hasResolver, hasRecords) {
  //do no show records if it only has a resolver if not owner
  if (!isOwner && hasRecords) {
    return true
  }
  //show records if it only has a resolver if owner so they can add
  if (isOwner && hasResolver) {
    return true
  }
  return false
}

function Records({
  domain,
  isOwner,
  refetch,
  account,
  hasResolver,
  isOldPublicResolver,
  isDeprecatedResolver,
  hasMigratedRecords,
  needsToBeMigrated
}) {
  const [recordAdded, setRecordAdded] = useState(0)

  const emptyRecords = RECORDS.filter(record => {
    if (record.value === 'address') {
      return isEmpty(domain['addr']) ? true : false
    }

    return isEmpty(domain[record.value]) ? true : false
  })

  let contentMutation
  if (domain.contentType === 'oldcontent') {
    contentMutation = SET_CONTENT
  } else {
    contentMutation = SET_CONTENTHASH
  }

  const hasRecords = hasAnyRecord(domain)
  const shouldShowRecords = calculateShouldShowRecords(
    isOwner,
    hasResolver,
    hasRecords
  )
  const canEditRecords = !isOldPublicResolver && isOwner

  if (!shouldShowRecords) {
    return null
  }

  return (
    <RecordsWrapper
      shouldShowRecords={shouldShowRecords}
      needsToBeMigrated={needsToBeMigrated}
    >
      {isOldPublicResolver ? (
        <CantEdit>
          You can’t edit or add records until you migrate to the new resolver.
        </CantEdit>
      ) : (
        <AddRecord
          emptyRecords={emptyRecords}
          title="Records"
          canEdit={canEditRecords}
          domain={domain}
          refetch={refetch}
          setRecordAdded={setRecordAdded}
        />
      )}
      {hasResolver && hasAnyRecord && (
        <>
          {!isEmpty(domain.addr) && (
            <RecordsItem
              canEdit={canEditRecords}
              domain={domain}
              keyName="Address"
              value={domain.addr}
              mutation={SET_ADDRESS}
              type="address"
              refetch={refetch}
              account={account}
            />
          )}
          {!isEmpty(domain.content) && (
            <RecordsItem
              canEdit={canEditRecords}
              domain={domain}
              keyName="Content"
              type="content"
              mutation={contentMutation}
              value={domain.content}
              refetch={refetch}
            />
          )}
          <Address
            canEdit={canEditRecords}
            domain={domain}
            recordAdded={recordAdded}
            mutation={SET_ADDR}
            query={GET_ADDR}
            title="Other Addresses"
          />
          <TextRecord
            canEdit={canEditRecords}
            domain={domain}
            recordAdded={recordAdded}
            mutation={SET_TEXT}
            query={GET_TEXT}
            title="Text Record"
          />
        </>
      )}
    </RecordsWrapper>
  )
}

function MigrationWarning() {
  return (
    <div>
      You’re using an outdated version of the public resolver, Click to migrate
      your resolver and records. You will need to confirm two transactions in
      order to migrate both your records and resolver. Learn More
    </div>
  )
}

const ResolverWrapper = styled('div')`
  ${p =>
    p.needsToBeMigrated
      ? `
    color: #ADBBCD;
    font-size: 14px;
    background: hsla(37, 91%, 55%, 0.1);
    padding: 20px;
    margin-bottom: 20px;
  `
      : 'background: none;'}
`

export default function ResolverAndRecords({
  domain,
  isOwner,
  refetch,
  account
}) {
  const hasResolver = hasAResolver(domain.resolver)
  let isOldPublicResolver = false
  let isDeprecatedResolver = false
  let areRecordsMigrated = true

  const {
    data: { getResolverMigrationInfo },
    loading
  } = useQuery(GET_RESOLVER_MIGRATION_INFO, {
    variables: {
      name: domain.name,
      resolver: domain.resolver
    },
    skip: !hasResolver
  })

  if (getResolverMigrationInfo) {
    isOldPublicResolver = getResolverMigrationInfo.isOldPublicResolver
    isDeprecatedResolver = getResolverMigrationInfo.isDeprecatedResolver
    areRecordsMigrated = getResolverMigrationInfo.areRecordsMigrated
  }

  const needsToBeMigrated =
    !loading && (isOldPublicResolver || isDeprecatedResolver)

  return (
    <>
      <ResolverWrapper needsToBeMigrated={needsToBeMigrated}>
        <DetailsItemEditable
          keyName="Resolver"
          type="address"
          value={domain.resolver}
          canEdit={isOwner}
          domain={domain}
          editButton="Set"
          mutationButton="Save"
          mutation={SET_RESOLVER}
          refetch={refetch}
          account={account}
          needsToBeMigrated={needsToBeMigrated}
        />
        {needsToBeMigrated && <MigrationWarning />}
      </ResolverWrapper>

      {hasResolver && (
        <Records
          domain={domain}
          refetch={refetch}
          account={account}
          isOwner={isOwner}
          hasResolver={hasResolver}
          needsToBeMigrated={needsToBeMigrated}
          isOldPublicResolver={isOldPublicResolver}
          isDeprecatedResolver={isDeprecatedResolver}
          areRecordsMigrated={areRecordsMigrated}
        />
      )}
    </>
  )
}
