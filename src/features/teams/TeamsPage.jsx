import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Popconfirm,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  message,
  Statistic,
  Empty,
  Divider,
  Dropdown,
} from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  SearchOutlined,
  KeyOutlined,
  MoreOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { teamsApi } from '../../services/teamsApi.js';
import { companiesApi } from '../../services/companiesApi.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export function TeamsPage() {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState('teams');

  // Teams state
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsSearch, setTeamsSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSearch, setMembersSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('');

  // Roles state
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [permissionSchema, setPermissionSchema] = useState({ modules: [], actions: [] });

  // Companies state (for super admin assignment)
  const [companies, setCompanies] = useState([]);

  // Modals state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm] = Form.useForm();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm] = Form.useForm();
  const [inviting, setInviting] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm] = Form.useForm();
  const [rolePermissions, setRolePermissions] = useState({});
  const [savingRole, setSavingRole] = useState(false);

  const [isMemberRoleModalOpen, setIsMemberRoleModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState(null);
  const [memberRoleForm] = Form.useForm();

  // ----------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const res = await teamsApi.getTeams({ search: teamsSearch });
      if (res.success) {
        setTeams(res.teams || []);
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.fetchFailed', 'Failed to load teams'));
    } finally {
      setTeamsLoading(false);
    }
  }, [teamsSearch, t]);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await teamsApi.getMembers({
        search: membersSearch,
        role: memberRoleFilter || undefined,
        status: memberStatusFilter || undefined,
      });
      if (res.success) {
        setMembers(res.members || []);
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.fetchMembersFailed', 'Failed to load team members'));
    } finally {
      setMembersLoading(false);
    }
  }, [membersSearch, memberRoleFilter, memberStatusFilter, t]);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const [rolesRes, schemaRes] = await Promise.all([
        teamsApi.getRoles(),
        teamsApi.getPermissionSchema(),
      ]);
      if (rolesRes.success) {
        setRoles(rolesRes.data || []);
      }
      if (schemaRes.success) {
        setPermissionSchema(schemaRes.data || { modules: [], actions: [] });
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('roles.fetchFailed', 'Failed to load roles'));
    } finally {
      setRolesLoading(false);
    }
  }, [t]);

  const fetchCompanies = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await companiesApi.getCompanies({ limit: 100 });
      if (res.success) {
        setCompanies(res.data?.companies || res.data || []);
      }
    } catch (err) {
      console.warn('Companies list lookup failed', err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchTeams();
    fetchMembers();
    fetchRoles();
    fetchCompanies();
  }, [fetchTeams, fetchMembers, fetchRoles, fetchCompanies]);

  // ----------------------------------------------------
  // Team Actions
  // ----------------------------------------------------

  const handleOpenCreateTeam = () => {
    setEditingTeam(null);
    teamForm.resetFields();
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeam = (team) => {
    setEditingTeam(team);
    teamForm.setFieldsValue({
      name: team.name,
      description: team.description,
      companyId: team.companyId,
    });
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async () => {
    try {
      const values = await teamForm.validateFields();
      if (editingTeam) {
        const res = await teamsApi.updateTeam(editingTeam.id, values);
        if (res.success) {
          message.success(t('teams.teamUpdated', 'Team updated successfully'));
        }
      } else {
        const res = await teamsApi.createTeam(values);
        if (res.success) {
          message.success(t('teams.teamCreated', 'Team created successfully'));
        }
      }
      setIsTeamModalOpen(false);
      fetchTeams();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('teams.saveFailed', 'Failed to save team'));
    }
  };

  const handleDeleteTeam = async (teamId) => {
    try {
      const res = await teamsApi.deleteTeam(teamId);
      if (res.success) {
        message.success(t('teams.teamDeleted', 'Team deleted successfully'));
        fetchTeams();
        if (selectedTeam?.id === teamId) setSelectedTeam(null);
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.deleteFailed', 'Failed to delete team'));
    }
  };

  // ----------------------------------------------------
  // Member & Invitation Actions
  // ----------------------------------------------------

  const handleOpenInviteModal = () => {
    inviteForm.resetFields();
    if (selectedTeam) {
      inviteForm.setFieldsValue({ teamId: selectedTeam.id });
    }
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async () => {
    try {
      const values = await inviteForm.validateFields();
      setInviting(true);
      const res = await teamsApi.inviteMember(values);
      if (res.success) {
        message.success(res.message || t('teams.inviteSent', 'Invitation sent successfully'));
        setIsInviteModalOpen(false);
        fetchMembers();
        fetchTeams();
      }
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('teams.inviteFailed', 'Failed to send invitation'));
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      const res = await teamsApi.resendInvitation(invitationId);
      if (res.success) {
        message.success(res.message || t('teams.inviteResent', 'Invitation resent successfully'));
        fetchMembers();
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.resendFailed', 'Failed to resend invitation'));
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const res = await teamsApi.updateMemberStatus(userId, { status: newStatus });
      if (res.success) {
        message.success(t('teams.statusUpdated', `Member status changed to ${newStatus}`));
        fetchMembers();
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('teams.statusFailed', 'Failed to update member status'));
    }
  };

  const handleOpenChangeRole = (member) => {
    setTargetMember(member);
    memberRoleForm.setFieldsValue({
      roleId: member.customRole?.id || member.role,
    });
    setIsMemberRoleModalOpen(true);
  };

  const handleSaveMemberRole = async () => {
    try {
      const values = await memberRoleForm.validateFields();
      const roleIdOrCode = values.roleId;

      // Find if selected item is a custom role ID or system role code
      const selectedRoleObj = roles.find((r) => r.id === roleIdOrCode || r.code === roleIdOrCode);

      // If member has a team membership, update primary team member role or direct user role
      if (targetMember?.teams?.[0]?.teamId) {
        const teamId = targetMember.teams[0].teamId;
        // Find team member id
        const teamObj = teams.find((t) => t.id === teamId);
        const tm = teamObj?.members?.find((m) => m.companyUser?.id === targetMember.id || m.admin?.id === targetMember.id);
        if (tm) {
          await teamsApi.updateMemberRole(teamId, tm.id, {
            roleId: selectedRoleObj?.id || null,
            role: selectedRoleObj?.code || roleIdOrCode,
          });
        }
      }

      message.success(t('teams.roleAssigned', 'Role updated successfully'));
      setIsMemberRoleModalOpen(false);
      fetchMembers();
      fetchTeams();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('teams.roleUpdateFailed', 'Failed to update member role'));
    }
  };

  // ----------------------------------------------------
  // Role & Permission Matrix Actions
  // ----------------------------------------------------

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    // Default matrix all false
    const initialMatrix = {};
    (permissionSchema.modules || []).forEach((m) => {
      initialMatrix[m.key] = {};
      (permissionSchema.actions || []).forEach((a) => {
        initialMatrix[m.key][a.key] = false;
      });
    });
    setRolePermissions(initialMatrix);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    roleForm.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setRolePermissions(role.permissions || {});
    setIsRoleModalOpen(true);
  };

  const handlePermissionToggle = (moduleKey, actionKey, checked) => {
    if (editingRole?.code === 'SUPER_ADMIN') return; // Cannot alter super admin permissions
    setRolePermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] || {}),
        [actionKey]: checked,
      },
    }));
  };

  const handleToggleAllForModule = (moduleKey, checkAll) => {
    if (editingRole?.code === 'SUPER_ADMIN') return;
    setRolePermissions((prev) => {
      const updatedModule = {};
      (permissionSchema.actions || []).forEach((a) => {
        updatedModule[a.key] = checkAll;
      });
      return {
        ...prev,
        [moduleKey]: updatedModule,
      };
    });
  };

  const handleToggleAllAction = (actionKey, checkAll) => {
    if (editingRole?.code === 'SUPER_ADMIN') return;
    setRolePermissions((prev) => {
      const updated = { ...prev };
      (permissionSchema.modules || []).forEach((m) => {
        updated[m.key] = {
          ...(updated[m.key] || {}),
          [actionKey]: checkAll,
        };
      });
      return updated;
    });
  };

  const handleSaveRole = async () => {
    try {
      const values = await roleForm.validateFields();
      setSavingRole(true);

      // Convert rolePermissions object to array: [{ module, action, allowed }]
      const permArray = [];
      Object.entries(rolePermissions).forEach(([mod, actions]) => {
        Object.entries(actions).forEach(([act, allowed]) => {
          permArray.push({
            module: mod,
            action: act,
            allowed: Boolean(allowed),
          });
        });
      });

      if (editingRole) {
        const res = await teamsApi.updateRole(editingRole.id, {
          name: values.name,
          description: values.description,
          permissions: permArray,
        });
        if (res.success) {
          message.success(t('roles.roleUpdated', 'Role and permissions updated successfully'));
        }
      } else {
        const res = await teamsApi.createRole({
          name: values.name,
          description: values.description,
          companyId: values.companyId || null,
          permissions: permArray,
        });
        if (res.success) {
          message.success(t('roles.roleCreated', 'Custom role created successfully'));
        }
      }

      setIsRoleModalOpen(false);
      fetchRoles();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || t('roles.saveFailed', 'Failed to save role'));
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const res = await teamsApi.deleteRole(roleId);
      if (res.success) {
        message.success(t('roles.roleDeleted', 'Role deleted successfully'));
        fetchRoles();
      }
    } catch (err) {
      message.error(err.response?.data?.error || t('roles.deleteFailed', 'Failed to delete role'));
    }
  };

  // ----------------------------------------------------
  // Columns Definitions
  // ----------------------------------------------------

  const teamColumns = [
    {
      title: t('teams.name', 'Team Name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{text}</Text>
          {record.description && <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>}
        </Space>
      ),
    },
    {
      title: t('teams.company', 'Company'),
      dataIndex: ['company', 'name'],
      key: 'company',
      render: (companyName) => (companyName ? <Tag color="blue">{companyName}</Tag> : <Tag>Platform</Tag>),
    },
    {
      title: t('teams.membersCount', 'Members'),
      dataIndex: '_count',
      key: 'membersCount',
      render: (count) => (
        <Badge
          count={count?.members || 0}
          overflowCount={999}
          style={{ backgroundColor: '#0284c7' }}
        />
      ),
    },
    {
      title: t('teams.created', 'Created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => new Date(d).toLocaleDateString(),
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditTeam(record)}
          >
            {t('common.edit', 'Edit')}
          </Button>
          <Popconfirm
            title={t('teams.deleteConfirm', 'Are you sure you want to delete this team?')}
            description={t('teams.deleteWarning', 'Members will remain in the company directory.')}
            onConfirm={() => handleDeleteTeam(record.id)}
            okText={t('common.yes', 'Yes')}
            cancelText={t('common.no', 'No')}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t('common.delete', 'Delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const memberColumns = [
    {
      title: t('teams.member', 'Member'),
      key: 'member',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: t('teams.assignedRole', 'Role'),
      key: 'role',
      render: (_, record) => {
        const roleName = record.effectiveRoleName || record.role;
        const isSys = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(roleName);
        return (
          <Space>
            <Tag color={isSys ? 'geekblue' : 'purple'}>
              {isSys ? <CrownOutlined style={{ marginRight: 4 }} /> : null}
              {roleName}
            </Tag>
            <Button
              type="link"
              size="small"
              onClick={() => handleOpenChangeRole(record)}
              style={{ padding: 0 }}
            >
              {t('teams.change', 'Change')}
            </Button>
          </Space>
        );
      },
    },
    {
      title: t('teams.teamsJoined', 'Teams'),
      dataIndex: 'teams',
      key: 'teams',
      render: (memberTeams) =>
        memberTeams && memberTeams.length > 0 ? (
          <Space wrap size={[0, 4]}>
            {memberTeams.map((t) => (
              <Tag key={t.teamId}>{t.teamName}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary" italic>{t('teams.noTeam', 'No team')}</Text>
        ),
    },
    {
      title: t('teams.status', 'Status'),
      key: 'status',
      render: (_, record) => {
        const s = record.status;
        const colorMap = {
          ACTIVE: 'success',
          INVITED: 'warning',
          SUSPENDED: 'error',
          DEACTIVATED: 'default',
        };
        return (
          <Space direction="vertical" size={2}>
            <Tag color={colorMap[s] || 'default'}>{s}</Tag>
            {s === 'INVITED' && record.pendingInvitation && (
              <Button
                type="link"
                size="small"
                icon={<MailOutlined />}
                onClick={() => handleResendInvitation(record.pendingInvitation.id)}
                style={{ padding: 0, fontSize: 11 }}
              >
                {t('teams.resendInvite', 'Resend Invite')}
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'role',
                label: t('teams.changeRole', 'Change Role'),
                icon: <KeyOutlined />,
                onClick: () => handleOpenChangeRole(record),
              },
              record.status !== 'ACTIVE' && {
                key: 'activate',
                label: t('teams.activate', 'Activate Member'),
                icon: <CheckCircleOutlined />,
                onClick: () => handleStatusChange(record.id, 'ACTIVE'),
              },
              record.status !== 'SUSPENDED' && {
                key: 'suspend',
                label: t('teams.suspend', 'Suspend Access'),
                icon: <StopOutlined />,
                danger: true,
                onClick: () => handleStatusChange(record.id, 'SUSPENDED'),
              },
              record.status !== 'DEACTIVATED' && {
                key: 'deactivate',
                label: t('teams.deactivate', 'Deactivate'),
                icon: <CloseCircleOutlined />,
                danger: true,
                onClick: () => handleStatusChange(record.id, 'DEACTIVATED'),
              },
            ].filter(Boolean),
          }}
          trigger={['click']}
        >
          <Button size="small" icon={<MoreOutlined />}>
            {t('common.manage', 'Manage')}
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8, color: '#0284c7' }} />
            {t('teams.pageTitle', 'Teams & Permission Management (RBAC)')}
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            {t(
              'teams.pageSubtitle',
              'Organize recruitment teams, invite members with secure token-based activation, and configure granular role-based permissions.'
            )}
          </Paragraph>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleOpenInviteModal}
            style={{ backgroundColor: '#0284c7' }}
          >
            {t('teams.inviteMember', 'Invite Member')}
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={handleOpenCreateTeam}
          >
            {t('teams.createTeam', 'Create Team')}
          </Button>
        </Space>
      </div>

      {/* Top Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={t('teams.totalTeams', 'Active Teams')}
              value={teams.length}
              prefix={<TeamOutlined style={{ color: '#0284c7' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={t('teams.totalMembers', 'Team Members')}
              value={members.length}
              prefix={<UserAddOutlined style={{ color: '#10b981' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={t('roles.totalRoles', 'Defined Roles')}
              value={roles.length}
              prefix={<SafetyCertificateOutlined style={{ color: '#8b5cf6' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabs Container */}
      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'teams',
              label: (
                <span>
                  <TeamOutlined style={{ marginRight: 6 }} />
                  {t('teams.tabTeams', 'Teams & Members')}
                </span>
              ),
              children: (
                <div>
                  {/* Teams Directory Section */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {t('teams.teamsList', 'Teams Directory')}
                      </Title>
                      <Space>
                        <Input
                          placeholder={t('teams.searchTeams', 'Search teams...')}
                          prefix={<SearchOutlined />}
                          value={teamsSearch}
                          onChange={(e) => setTeamsSearch(e.target.value)}
                          onPressEnter={fetchTeams}
                          allowClear
                          style={{ width: 220 }}
                        />
                        <Button icon={<ReloadOutlined />} onClick={fetchTeams} />
                      </Space>
                    </div>

                    <Table
                      dataSource={teams}
                      columns={teamColumns}
                      rowKey="id"
                      loading={teamsLoading}
                      pagination={{ pageSize: 5 }}
                      locale={{ emptyText: <Empty description={t('teams.noTeamsFound', 'No teams created yet')} /> }}
                    />
                  </div>

                  <Divider />

                  {/* Members Directory Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {t('teams.membersDirectory', 'Members Directory')}
                      </Title>
                      <Space wrap>
                        <Input
                          placeholder={t('teams.searchMembers', 'Search by name or email...')}
                          prefix={<SearchOutlined />}
                          value={membersSearch}
                          onChange={(e) => setMembersSearch(e.target.value)}
                          onPressEnter={fetchMembers}
                          allowClear
                          style={{ width: 220 }}
                        />
                        <Select
                          placeholder={t('teams.filterRole', 'Filter by Role')}
                          value={memberRoleFilter || undefined}
                          onChange={(val) => setMemberRoleFilter(val || '')}
                          allowClear
                          style={{ width: 160 }}
                        >
                          {roles.map((r) => (
                            <Option key={r.code || r.id} value={r.code || r.name}>
                              {r.name}
                            </Option>
                          ))}
                        </Select>
                        <Select
                          placeholder={t('teams.filterStatus', 'Filter by Status')}
                          value={memberStatusFilter || undefined}
                          onChange={(val) => setMemberStatusFilter(val || '')}
                          allowClear
                          style={{ width: 140 }}
                        >
                          <Option value="ACTIVE">ACTIVE</Option>
                          <Option value="INVITED">INVITED</Option>
                          <Option value="SUSPENDED">SUSPENDED</Option>
                          <Option value="DEACTIVATED">DEACTIVATED</Option>
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={fetchMembers} />
                      </Space>
                    </div>

                    <Table
                      dataSource={members}
                      columns={memberColumns}
                      rowKey="id"
                      loading={membersLoading}
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: <Empty description={t('teams.noMembersFound', 'No members found')} /> }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'roles',
              label: (
                <span>
                  <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                  {t('roles.tabRoles', 'Roles & Granular Permissions')}
                </span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        {t('roles.rolesDirectory', 'Role-Based Access Control (RBAC)')}
                      </Title>
                      <Text type="secondary">
                        {t('roles.rolesDescription', 'Configure reusable roles and matrix permissions across modules and actions.')}
                      </Text>
                    </div>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreateRole}
                        style={{ backgroundColor: '#0284c7' }}
                      >
                        {t('roles.createCustomRole', 'Create Custom Role')}
                      </Button>
                      <Button icon={<ReloadOutlined />} onClick={fetchRoles} />
                    </Space>
                  </div>

                  {/* Roles Cards Grid */}
                  <Row gutter={[16, 16]}>
                    {roles.map((role) => (
                      <Col xs={24} md={12} lg={8} key={role.id}>
                        <Card
                          hoverable
                          bordered
                          style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            borderColor: role.isSystem ? '#bae6fd' : '#e2e8f0',
                            backgroundColor: role.isSystem ? '#f8fafc' : '#ffffff',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <Text strong style={{ fontSize: 16 }}>
                                {role.name}
                              </Text>
                              {role.isSystem ? (
                                <Tag color="blue">{t('roles.systemRole', 'System')}</Tag>
                              ) : (
                                <Tag color="purple">{t('roles.customRole', 'Custom')}</Tag>
                              )}
                            </div>

                            <Text type="secondary" style={{ fontSize: 13, display: 'block', minHeight: 40, marginBottom: 12 }}>
                              {role.description || t('roles.noDescription', 'No description provided')}
                            </Text>

                            <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <Text type="secondary">{t('roles.assignedMembers', 'Assigned Members')}:</Text>
                                <Badge count={role.assignedCount || 0} overflowCount={999} style={{ backgroundColor: '#64748b' }} />
                              </div>
                            </Space>
                          </div>

                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                            <Button
                              size="small"
                              icon={<KeyOutlined />}
                              onClick={() => handleOpenEditRole(role)}
                            >
                              {role.isSystem ? t('roles.viewPermissions', 'View Permissions') : t('roles.editPermissions', 'Configure Matrix')}
                            </Button>

                            {!role.isSystem && (
                              <Popconfirm
                                title={t('roles.deleteConfirm', 'Delete this custom role?')}
                                description={t('roles.deleteWarning', 'Role must have 0 assigned members.')}
                                onConfirm={() => handleDeleteRole(role.id)}
                                disabled={role.assignedCount > 0}
                                okText={t('common.yes', 'Yes')}
                                cancelText={t('common.no', 'No')}
                              >
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  disabled={role.assignedCount > 0}
                                />
                              </Popconfirm>
                            )}
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ---------------------------------------------------- */}
      {/* Create / Edit Team Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={editingTeam ? t('teams.editTeam', 'Edit Team') : t('teams.createTeam', 'Create New Team')}
        open={isTeamModalOpen}
        onOk={handleSaveTeam}
        onCancel={() => setIsTeamModalOpen(false)}
        okText={t('common.save', 'Save')}
        cancelText={t('common.cancel', 'Cancel')}
      >
        <Form form={teamForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('teams.teamName', 'Team Name')}
            rules={[{ required: true, message: t('teams.nameRequired', 'Team name is required') }]}
          >
            <Input placeholder={t('teams.teamNamePlaceholder', 'e.g. Engineering Recruitment Team')} maxLength={100} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('teams.description', 'Description')}
          >
            <Input.TextArea rows={3} placeholder={t('teams.descPlaceholder', 'Purpose and scope of this team...')} maxLength={500} />
          </Form.Item>

          {isSuperAdmin && !editingTeam && (
            <Form.Item
              name="companyId"
              label={t('teams.associateCompany', 'Associate Company')}
              help={t('teams.companyHelp', 'Leave empty to create a platform-wide administrative team')}
            >
              <Select placeholder={t('teams.selectCompany', 'Select Company (Optional)')} allowClear>
                {companies.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name} ({c.companyCode || c.id.slice(0, 8)})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Invite Member Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={t('teams.inviteTitle', 'Invite Member to Team')}
        open={isInviteModalOpen}
        onOk={handleSendInvite}
        onCancel={() => setIsInviteModalOpen(false)}
        confirmLoading={inviting}
        okText={t('teams.sendInvite', 'Send Invitation')}
        cancelText={t('common.cancel', 'Cancel')}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          {t(
            'teams.inviteInfo',
            'An invitation email with a single-use secure link will be sent to the recipient. They will configure their confidential credentials upon accepting. No permanent or default passwords are used.'
          )}
        </Paragraph>

        <Form form={inviteForm} layout="vertical">
          <Form.Item
            name="email"
            label={t('teams.emailAddress', 'Email Address')}
            rules={[
              { required: true, message: t('teams.emailRequired', 'Email is required') },
              { type: 'email', message: t('teams.emailInvalid', 'Please enter a valid email address') },
            ]}
          >
            <Input placeholder="colleague@organization.com" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label={t('teams.firstName', 'First Name')}>
                <Input placeholder="John" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label={t('teams.lastName', 'Last Name')}>
                <Input placeholder="Doe" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="teamId"
            label={t('teams.assignTeam', 'Assign to Team')}
          >
            <Select placeholder={t('teams.selectTeam', 'Select Team (Optional)')} allowClear>
              {teams.map((t) => (
                <Option key={t.id} value={t.id}>
                  {t.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="roleId"
            label={t('teams.selectRole', 'Assigned Role')}
            rules={[{ required: true, message: t('teams.roleRequired', 'Please assign a role') }]}
            initialValue="RECRUITER"
          >
            <Select placeholder={t('teams.chooseRole', 'Choose Role')}>
              {roles.map((r) => (
                <Option key={r.id || r.code} value={r.id || r.code}>
                  {r.name} {r.isSystem ? `(${t('roles.systemRole', 'System')})` : `(${t('roles.customRole', 'Custom')})`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {isSuperAdmin && (
            <Form.Item
              name="companyId"
              label={t('teams.company', 'Company')}
              rules={[{ required: true, message: t('teams.companyRequired', 'Company is required') }]}
            >
              <Select placeholder={t('teams.selectCompany', 'Select Company')}>
                {companies.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Change Member Role Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={t('teams.changeMemberRole', 'Change Member Role')}
        open={isMemberRoleModalOpen}
        onOk={handleSaveMemberRole}
        onCancel={() => setIsMemberRoleModalOpen(false)}
        okText={t('common.save', 'Save')}
        cancelText={t('common.cancel', 'Cancel')}
      >
        <Form form={memberRoleForm} layout="vertical">
          <Paragraph>
            <Text strong>{targetMember?.name}</Text> ({targetMember?.email})
          </Paragraph>

          <Form.Item
            name="roleId"
            label={t('teams.newRole', 'New Role')}
            rules={[{ required: true, message: t('teams.roleRequired', 'Role is required') }]}
          >
            <Select placeholder={t('teams.chooseRole', 'Choose Role')}>
              {roles.map((r) => (
                <Option key={r.id || r.code} value={r.id || r.code}>
                  {r.name} {r.isSystem ? `(${t('roles.systemRole', 'System')})` : `(${t('roles.customRole', 'Custom')})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Granular Permission Matrix Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyOutlined style={{ color: '#0284c7' }} />
            <span>
              {editingRole
                ? `${t('roles.configureMatrix', 'Permission Matrix')}: ${editingRole.name}`
                : t('roles.newRole', 'New Custom Role & Permission Matrix')}
            </span>
          </div>
        }
        open={isRoleModalOpen}
        onOk={handleSaveRole}
        onCancel={() => setIsRoleModalOpen(false)}
        width={900}
        confirmLoading={savingRole}
        okText={t('common.save', 'Save Matrix')}
        cancelText={t('common.cancel', 'Cancel')}
      >
        <Form form={roleForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('roles.roleName', 'Role Name')}
                rules={[{ required: true, message: t('roles.nameRequired', 'Role name is required') }]}
              >
                <Input
                  disabled={editingRole?.isSystem}
                  placeholder={t('roles.roleNamePlaceholder', 'e.g. Senior Talent Lead')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label={t('roles.description', 'Role Description')}>
                <Input
                  disabled={editingRole?.isSystem && editingRole?.code === 'SUPER_ADMIN'}
                  placeholder={t('roles.descPlaceholder', 'Scope and responsibility of this role...')}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {editingRole?.isSystem && (
          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t(
                'roles.systemRoleNotice',
                'System roles are defined by platform policy. Super Admin possesses comprehensive unconditional access across all actions.'
              )}
            </Text>
          </div>
        )}

        {/* Matrix Quick Actions */}
        {!editingRole?.isSystem && (
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button size="small" onClick={() => handleToggleAllAction('READ', true)}>
              {t('roles.grantAllRead', 'Grant All Read')}
            </Button>
            <Button size="small" onClick={() => handleToggleAllAction('READ', false)}>
              {t('roles.clearAllRead', 'Clear All Read')}
            </Button>
          </div>
        )}

        {/* The Permission Matrix Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: 200 }}>
                  {t('roles.module', 'Module / Resource')}
                </th>
                {(permissionSchema.actions || []).map((act) => (
                  <th key={act.key} style={{ padding: '12px 16px', textAlign: 'center', minWidth: 90 }}>
                    <Tooltip title={act.description}>
                      <span>{act.label}</span>
                    </Tooltip>
                  </th>
                ))}
                {!editingRole?.isSystem && (
                  <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: 100 }}>
                    {t('roles.quickSelect', 'Quick Select')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(permissionSchema.modules || []).map((mod, idx) => {
                const isSuper = editingRole?.code === 'SUPER_ADMIN';
                const rowActions = rolePermissions[mod.key] || {};
                const allChecked = (permissionSchema.actions || []).every((a) => rowActions[a.key]);

                return (
                  <tr
                    key={mod.key}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <Text strong style={{ fontSize: 13 }}>{mod.label}</Text>
                      {mod.description && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>{mod.description}</div>
                      )}
                    </td>

                    {(permissionSchema.actions || []).map((act) => {
                      const isAllowed = isSuper ? true : Boolean(rowActions[act.key]);
                      return (
                        <td key={act.key} style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <Checkbox
                            checked={isAllowed}
                            disabled={isSuper || (editingRole?.isSystem && !isSuperAdmin)}
                            onChange={(e) => handlePermissionToggle(mod.key, act.key, e.target.checked)}
                          />
                        </td>
                      );
                    })}

                    {!editingRole?.isSystem && (
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <Button
                          size="small"
                          type="text"
                          onClick={() => handleToggleAllForModule(mod.key, !allChecked)}
                          style={{ fontSize: 11 }}
                        >
                          {allChecked ? t('roles.clear', 'Clear') : t('roles.all', 'All')}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
